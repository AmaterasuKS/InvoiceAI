import Groq from "groq-sdk";
import { query } from "../config/database.js";
import { getRedis } from "../config/redis.js";

const CHAT_KEY = (userId) => `invoiceai:chat:${userId}`;
const MAX_HISTORY_MESSAGES = 10;
const MODEL_ID = "llama-3.3-70b-versatile";

function getGroqClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.includes("вставить")) {
    throw new Error("GROQ_API_KEY не задан или нужно указать реальный ключ Groq");
  }
  return new Groq({ apiKey: key });
}

/**
 * Собирает актуальный финансовый снимок пользователя для системного промпта.
 */
export async function buildUserFinancialContext(userId) {
  const { rows: statusRows } = await query(
    `SELECT status, COUNT(*)::int AS cnt, COALESCE(SUM(total), 0)::numeric AS sum_total
     FROM invoices WHERE user_id = $1
     GROUP BY status`,
    [userId]
  );

  const { rows: agg } = await query(
    `SELECT
       COUNT(*)::int AS invoice_count,
       COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)::numeric AS paid_total,
       COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue', 'draft') THEN total ELSE 0 END), 0)::numeric AS open_total,
       COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0)::numeric AS overdue_amount,
       COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_invoices
     FROM invoices WHERE user_id = $1`,
    [userId]
  );

  const { rows: monthlyPaid } = await query(
    `SELECT TO_CHAR(issue_date, 'YYYY-MM') AS month,
            COALESCE(SUM(total), 0)::numeric AS paid_total
     FROM invoices
     WHERE user_id = $1 AND status = 'paid'
     GROUP BY 1
     ORDER BY 1 DESC
     LIMIT 6`,
    [userId]
  );

  const { rows: topClients } = await query(
    `SELECT c.name,
            COALESCE(SUM(i.total), 0)::numeric AS paid_total,
            COUNT(*)::int AS paid_invoices
     FROM clients c
     JOIN invoices i ON i.client_id = c.id AND i.user_id = c.user_id
     WHERE c.user_id = $1 AND i.status = 'paid'
     GROUP BY c.id, c.name
     ORDER BY paid_total DESC
     LIMIT 5`,
    [userId]
  );

  const { rows: debtors } = await query(
    `SELECT c.name,
            c.email,
            COALESCE(SUM(i.total), 0)::numeric AS outstanding,
            COUNT(*)::int AS open_invoices,
            MIN(i.due_date) AS earliest_due
     FROM clients c
     JOIN invoices i ON i.client_id = c.id AND i.user_id = c.user_id
     WHERE c.user_id = $1 AND i.status IN ('sent', 'overdue')
     GROUP BY c.id, c.name, c.email
     HAVING COALESCE(SUM(i.total), 0) > 0
     ORDER BY outstanding DESC
     LIMIT 10`,
    [userId]
  );

  const paidTotal = Number(agg[0]?.paid_total ?? 0);
  const openTotal = Number(agg[0]?.open_total ?? 0);
  const allTotal = paidTotal + openTotal;
  const paymentRatePct =
    allTotal > 0 ? Math.round((paidTotal / allTotal) * 1000) / 10 : null;

  const lastThreeMonths = monthlyPaid.slice(0, 3).map((r) => Number(r.paid_total));
  const avgLast3 =
    lastThreeMonths.length > 0
      ? Math.round((lastThreeMonths.reduce((a, b) => a + b, 0) / lastThreeMonths.length) * 100) / 100
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    invoices: {
      totalCount: agg[0]?.invoice_count ?? 0,
      paidTotal,
      openTotal,
      overdueAmount: Number(agg[0]?.overdue_amount ?? 0),
      overdueInvoices: agg[0]?.overdue_invoices ?? 0,
      paymentRatePercent: paymentRatePct,
      byStatus: statusRows.map((r) => ({
        status: r.status,
        count: r.cnt,
        sum: Number(r.sum_total),
      })),
    },
    revenueByMonth: monthlyPaid.map((r) => ({
      month: r.month,
      paidTotal: Number(r.paid_total),
    })),
    heuristics: {
      avgPaidLastThreeRecordedMonths: avgLast3,
      simpleNextMonthCashHint:
        avgLast3 > 0
          ? `Recent average paid (last up to 3 months with data): ~${avgLast3}. Use with caution; not a forecast.`
          : "Not enough paid history for a simple average.",
    },
    topClientsByPaid: topClients.map((r) => ({
      name: r.name,
      paidTotal: Number(r.paid_total),
      paidInvoices: r.paid_invoices,
    })),
    debtors: debtors.map((r) => ({
      name: r.name,
      email: r.email,
      outstanding: Number(r.outstanding),
      openInvoices: r.open_invoices,
      earliestDue: r.earliest_due,
    })),
  };
}

async function loadHistory(userId) {
  const redis = await getRedis();
  const raw = await redis.get(CHAT_KEY(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveHistory(userId, messages) {
  const redis = await getRedis();
  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
  await redis.set(CHAT_KEY(userId), JSON.stringify(trimmed), { EX: 60 * 60 * 24 * 14 });
}

function buildSystemPrompt(contextJson) {
  return `You are InvoiceAI, a senior finance & invoicing copilot embedded in the user's app.

You MUST use the REAL user data below (JSON). Give specific numbers, client names, and dates when relevant. Avoid generic advice if the data allows precision.

If the user asks for cash flow next month: combine paid revenue trend, open/overdue amounts, and debtor concentration — state assumptions clearly.

Help with:
- payment reminders timing (who/when/why)
- polishing service line descriptions for invoices
- interpreting dashboard metrics
- risk flags (overdue concentration, stalled "sent" invoices)

LANGUAGE: Reply in the same language as the user's latest message (Russian or English). If mixed, prefer the dominant language.

DATA_SNAPSHOT_JSON:
${JSON.stringify(contextJson)}

Keep answers concise but actionable. Do not fabricate figures not present in DATA_SNAPSHOT_JSON.`;
}

/**
 * Отправляет сообщение в Groq с учётом контекста БД и истории (до ${MAX_HISTORY_MESSAGES} сообщений).
 */
export async function runChatTurn(userId, userMessage) {
  const text = String(userMessage ?? "").trim();
  if (!text) {
    throw new Error("Пустое сообщение");
  }
  if (text.length > 8000) {
    throw new Error("Сообщение слишком длинное");
  }

  const context = await buildUserFinancialContext(userId);
  const systemContent = buildSystemPrompt(context);

  const history = await loadHistory(userId);
  const groq = getGroqClient();

  const messages = [
    { role: "system", content: systemContent },
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: text },
  ];

  const completion = await groq.chat.completions.create({
    model: MODEL_ID,
    messages,
    temperature: 0.35,
    max_tokens: 1024,
  });

  const reply =
    completion.choices?.[0]?.message?.content?.trim() ||
    "Не удалось получить ответ модели. Попробуйте ещё раз.";

  const nextHistory = [...history, { role: "user", content: text }, { role: "assistant", content: reply }];
  await saveHistory(userId, nextHistory);

  return {
    reply,
    model: MODEL_ID,
    contextGeneratedAt: context.generatedAt,
  };
}
