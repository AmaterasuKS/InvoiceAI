import nodemailer from "nodemailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let transporter = null;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP не настроен: задайте SMTP_HOST, SMTP_USER и SMTP_PASS в переменных окружения"
    );
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };
}

/**
 * Ленивое создание транспорта Nodemailer.
 */
export function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(getSmtpConfig());
  }
  return transporter;
}

export function resetTransporterForTests() {
  transporter = null;
}

function assertRecipient(to) {
  if (!to || typeof to !== "string" || !EMAIL_RE.test(to.trim())) {
    throw new Error("Некорректный email получателя");
  }
  return to.trim();
}

function defaultFrom(companyName) {
  const user = process.env.SMTP_USER;
  if (companyName && user) {
    return `"${String(companyName).replace(/"/g, "'")}" <${user}>`;
  }
  return user;
}

/**
 * Отправка произвольного письма.
 * @param {{ to: string, subject: string, text?: string, html?: string, replyTo?: string, attachments?: import('nodemailer').SendMailOptions['attachments'] }} opts
 */
export async function sendEmail({ to, subject, text, html, replyTo, attachments }) {
  const recipient = assertRecipient(to);
  if (!subject || typeof subject !== "string") {
    throw new Error("Укажите тему письма");
  }
  if (!text && !html) {
    throw new Error("Нужен text или html");
  }

  const transport = getTransporter();
  const info = await transport.sendMail({
    from: defaultFrom(),
    to: recipient,
    subject: subject.trim(),
    text,
    html,
    replyTo: replyTo?.trim?.() || undefined,
    attachments: attachments ?? undefined,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

/**
 * Отправка инвойса клиенту с PDF во вложении.
 * @param {object} params
 * @param {string} params.to — email клиента
 * @param {string} params.companyName — имя отправителя (From)
 * @param {string} params.invoiceNumber
 * @param {string|number} params.total
 * @param {string} params.currency
 * @param {Buffer} params.pdfBuffer
 * @param {string} [params.dueDate]
 */
export async function sendInvoiceEmail({
  to,
  companyName,
  invoiceNumber,
  total,
  currency,
  pdfBuffer,
  dueDate,
}) {
  const recipient = assertRecipient(to);
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    throw new Error("Нужен pdfBuffer (Buffer) с PDF инвойса");
  }

  const inv = String(invoiceNumber || "invoice");
  const cur = String(currency || "USD").toUpperCase();
  const totalFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(
    Number(total) || 0
  );

  const subject = `Invoice ${inv} from ${companyName || "InvoiceAI"}`;
  const dueLine = dueDate ? `\nDue date: ${dueDate}` : "";

  const text = [
    `Hello,`,
    ``,
    `Please find attached invoice ${inv}.`,
    `Amount due: ${totalFmt}.${dueLine}`,
    ``,
    `Thank you for your business.`,
    ``,
    `— ${companyName || "InvoiceAI"}`,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; line-height: 1.5;">
  <p>Hello,</p>
  <p>Please find <strong>invoice ${escapeHtml(inv)}</strong> attached.</p>
  <p><strong>Amount due:</strong> ${escapeHtml(totalFmt)}${dueDate ? `<br><strong>Due date:</strong> ${escapeHtml(String(dueDate))}` : ""}</p>
  <p>Thank you for your business.</p>
  <p style="color:#64748b;">— ${escapeHtml(companyName || "InvoiceAI")}</p>
</body>
</html>`.trim();

  const transport = getTransporter();
  const safeFile = inv.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const info = await transport.sendMail({
    from: defaultFrom(companyName),
    to: recipient,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `${safeFile}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
