import { query } from "../config/database.js";
import { findClientByIdForUser } from "../models/Client.js";
import {
  createInvoice,
  findInvoiceByIdForUser,
  listInvoicesForUser,
  updateInvoice,
  deleteInvoice,
  getNextInvoiceNumber,
} from "../models/Invoice.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function roundMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

function normalizeLineItems(raw) {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new Error("lineItems must be an array");
  }
  return raw.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Строка ${idx + 1}: неверный формат позиции`);
    }
    const description =
      typeof item.description === "string" ? item.description.trim() : String(item.description ?? "");
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error(`Строка ${idx + 1}: quantity должно быть неотрицательным числом`);
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(`Строка ${idx + 1}: unitPrice должно быть неотрицательным числом`);
    }
    return { description, quantity, unitPrice: roundMoney(unitPrice) };
  });
}

function computeTotals(lineItems, taxRatePercent) {
  const subtotal = roundMoney(
    lineItems.reduce((sum, it) => sum + roundMoney(it.quantity * it.unitPrice), 0)
  );
  const rate = Number(taxRatePercent);
  const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
  const taxAmount = roundMoney((subtotal * safeRate) / 100);
  const total = roundMoney(subtotal + taxAmount);
  return { subtotal, taxAmount, total, taxRate: safeRate };
}

async function refreshOverdueForUser(userId) {
  await query(
    `UPDATE invoices
     SET status = 'overdue', updated_at = NOW()
     WHERE user_id = $1 AND status = 'sent' AND due_date < CURRENT_DATE`,
    [userId]
  );
}

async function loadInvoiceWithClient(invoiceId, userId) {
  const invoice = await findInvoiceByIdForUser(invoiceId, userId);
  if (!invoice) return null;
  const client = await findClientByIdForUser(invoice.clientId, userId);
  return { invoice, client };
}

function parseDateField(value, label) {
  if (!value || typeof value !== "string") {
    throw new Error(`${label} обязательна (формат YYYY-MM-DD)`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label}: ожидается дата YYYY-MM-DD`);
  }
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${label}: некорректная дата`);
  }
  return value;
}

export async function getNextInvoiceNumberHandler(req, res, next) {
  try {
    const prefix =
      typeof req.query.prefix === "string" && req.query.prefix.trim()
        ? req.query.prefix.trim().slice(0, 20)
        : "INV";
    const number = await getNextInvoiceNumber(req.userId, prefix);
    return res.json({ invoiceNumber: number });
  } catch (err) {
    next(err);
  }
}

export async function listInvoices(req, res, next) {
  try {
    await refreshOverdueForUser(req.userId);
    const { status, clientId, fromDate, toDate, limit, offset, sort } = req.query;
    const result = await listInvoicesForUser(req.userId, {
      status: status ?? undefined,
      clientId: clientId ?? undefined,
      fromDate: fromDate ?? undefined,
      toDate: toDate ?? undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
      offset: offset !== undefined ? Number(offset) : undefined,
      sort: sort ?? undefined,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ message: "Некорректный идентификатор инвойса" });
    }
    await refreshOverdueForUser(req.userId);
    const data = await loadInvoiceWithClient(id, req.userId);
    if (!data) {
      return res.status(404).json({ message: "Инвойс не найден" });
    }
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function createInvoiceHandler(req, res, next) {
  try {
    const body = req.body ?? {};
    const {
      clientId,
      invoiceNumber: bodyInvoiceNumber,
      status,
      issueDate,
      dueDate,
      currency = "USD",
      taxRate,
      notes,
      lineItems: rawLineItems,
    } = body;

    if (!clientId || !isUuid(clientId)) {
      return res.status(400).json({ message: "Укажите корректный clientId" });
    }

    const client = await findClientByIdForUser(clientId, req.userId);
    if (!client) {
      return res.status(400).json({ message: "Клиент не найден" });
    }

    let lineItems;
    try {
      lineItems = normalizeLineItems(rawLineItems ?? []);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    const rateInput = taxRate !== undefined ? Number(taxRate) : 0;
    const { subtotal, taxAmount, total, taxRate: tr } = computeTotals(lineItems, rateInput);

    let invNum = bodyInvoiceNumber;
    if (invNum !== undefined && invNum !== null) {
      if (typeof invNum !== "string" || !invNum.trim()) {
        return res.status(400).json({ message: "invoiceNumber должна быть непустой строкой" });
      }
      invNum = invNum.trim();
    } else {
      invNum = await getNextInvoiceNumber(req.userId, "INV");
    }

    let issue;
    let due;
    try {
      issue = parseDateField(issueDate, "issueDate");
      due = parseDateField(dueDate, "dueDate");
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    const invoice = await createInvoice(req.userId, {
      clientId,
      invoiceNumber: invNum,
      status: status ?? "draft",
      issueDate: issue,
      dueDate: due,
      currency: typeof currency === "string" && currency.trim() ? currency.trim().toUpperCase() : "USD",
      taxRate: tr,
      subtotal,
      taxAmount,
      total,
      notes: notes ?? null,
      lineItems,
    });

    const withClient = await loadInvoiceWithClient(invoice.id, req.userId);
    return res.status(201).json(withClient);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        message: "Инвойс с таким номером уже существует. Укажите другой invoiceNumber.",
      });
    }
    if (err.message?.includes("Invalid invoice status")) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

export async function updateInvoiceHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ message: "Некорректный идентификатор инвойса" });
    }

    const existing = await findInvoiceByIdForUser(id, req.userId);
    if (!existing) {
      return res.status(404).json({ message: "Инвойс не найден" });
    }

    const body = req.body ?? {};
    const patch = {};

    if (body.clientId !== undefined) {
      if (!isUuid(body.clientId)) {
        return res.status(400).json({ message: "Некорректный clientId" });
      }
      const client = await findClientByIdForUser(body.clientId, req.userId);
      if (!client) {
        return res.status(400).json({ message: "Клиент не найден" });
      }
      patch.clientId = body.clientId;
    }

    if (body.invoiceNumber !== undefined) {
      if (typeof body.invoiceNumber !== "string" || !body.invoiceNumber.trim()) {
        return res.status(400).json({ message: "invoiceNumber должна быть непустой строкой" });
      }
      patch.invoiceNumber = body.invoiceNumber.trim();
    }

    if (body.status !== undefined) patch.status = body.status;
    if (body.currency !== undefined) {
      patch.currency =
        typeof body.currency === "string" && body.currency.trim()
          ? body.currency.trim().toUpperCase()
          : "USD";
    }
    if (body.notes !== undefined) patch.notes = body.notes;

    if (body.issueDate !== undefined) {
      try {
        patch.issueDate = parseDateField(body.issueDate, "issueDate");
      } catch (e) {
        return res.status(400).json({ message: e.message });
      }
    }
    if (body.dueDate !== undefined) {
      try {
        patch.dueDate = parseDateField(body.dueDate, "dueDate");
      } catch (e) {
        return res.status(400).json({ message: e.message });
      }
    }

    let lineItems = existing.lineItems;
    if (body.lineItems !== undefined) {
      try {
        lineItems = normalizeLineItems(body.lineItems);
      } catch (e) {
        return res.status(400).json({ message: e.message });
      }
      patch.lineItems = lineItems;
    }

    const effectiveTaxRate =
      body.taxRate !== undefined ? Number(body.taxRate) : existing.taxRate;
    if (body.lineItems !== undefined || body.taxRate !== undefined) {
      const { subtotal, taxAmount, total, taxRate: tr } = computeTotals(lineItems, effectiveTaxRate);
      patch.subtotal = subtotal;
      patch.taxAmount = taxAmount;
      patch.total = total;
      patch.taxRate = tr;
    }

    const updated = await updateInvoice(id, req.userId, patch);
    if (!updated) {
      return res.status(404).json({ message: "Инвойс не найден" });
    }

    await refreshOverdueForUser(req.userId);
    const data = await loadInvoiceWithClient(id, req.userId);
    return res.json(data);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        message: "Инвойс с таким номером уже существует.",
      });
    }
    if (err.message?.includes("Invalid invoice status")) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

export async function deleteInvoiceHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ message: "Некорректный идентификатор инвойса" });
    }
    const removed = await deleteInvoice(id, req.userId);
    if (!removed) {
      return res.status(404).json({ message: "Инвойс не найден" });
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
