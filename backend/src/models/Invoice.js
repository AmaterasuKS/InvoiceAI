import { query } from "../config/database.js";

const STATUSES = new Set(["draft", "sent", "paid", "overdue"]);

function mapInvoiceRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    invoiceNumber: row.invoice_number,
    status: row.status,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    currency: row.currency,
    taxRate: row.tax_rate != null ? Number(row.tax_rate) : 0,
    subtotal: row.subtotal != null ? Number(row.subtotal) : 0,
    taxAmount: row.tax_amount != null ? Number(row.tax_amount) : 0,
    total: row.total != null ? Number(row.total) : 0,
    notes: row.notes,
    lineItems: Array.isArray(row.line_items) ? row.line_items : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeStatus(status) {
  const s = String(status || "draft").toLowerCase();
  if (!STATUSES.has(s)) throw new Error(`Invalid invoice status: ${status}`);
  return s;
}

export async function createInvoice(userId, data) {
  const {
    clientId,
    invoiceNumber,
    status = "draft",
    issueDate,
    dueDate,
    currency = "USD",
    taxRate = 0,
    subtotal = 0,
    taxAmount = 0,
    total = 0,
    notes = null,
    lineItems = [],
  } = data;

  const st = normalizeStatus(status);
  const itemsJson = JSON.stringify(Array.isArray(lineItems) ? lineItems : []);

  const { rows } = await query(
    `INSERT INTO invoices (
       user_id, client_id, invoice_number, status, issue_date, due_date,
       currency, tax_rate, subtotal, tax_amount, total, notes, line_items
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
     RETURNING *`,
    [
      userId,
      clientId,
      invoiceNumber,
      st,
      issueDate,
      dueDate,
      currency,
      taxRate,
      subtotal,
      taxAmount,
      total,
      notes,
      itemsJson,
    ]
  );
  return mapInvoiceRow(rows[0]);
}

export async function findInvoiceByIdForUser(invoiceId, userId) {
  const { rows } = await query(`SELECT * FROM invoices WHERE id = $1 AND user_id = $2`, [
    invoiceId,
    userId,
  ]);
  return mapInvoiceRow(rows[0]);
}

export async function listInvoicesForUser(
  userId,
  { status, clientId, fromDate, toDate, limit = 50, offset = 0, sort = "issue_date_desc" } = {}
) {
  const params = [userId];
  let where = "WHERE user_id = $1";

  if (status) {
    params.push(normalizeStatus(status));
    where += ` AND status = $${params.length}`;
  }
  if (clientId) {
    params.push(clientId);
    where += ` AND client_id = $${params.length}`;
  }
  if (fromDate) {
    params.push(fromDate);
    where += ` AND issue_date >= $${params.length}`;
  }
  if (toDate) {
    params.push(toDate);
    where += ` AND issue_date <= $${params.length}`;
  }

  const orderMap = {
    issue_date_desc: "issue_date DESC, created_at DESC",
    issue_date_asc: "issue_date ASC, created_at ASC",
    total_desc: "total DESC, issue_date DESC",
    total_asc: "total ASC, issue_date DESC",
    created_at_desc: "created_at DESC",
  };
  const orderBy = orderMap[sort] || orderMap.issue_date_desc;

  params.push(Math.min(Number(limit) || 50, 200));
  params.push(Math.max(Number(offset) || 0, 0));

  const { rows } = await query(
    `SELECT * FROM invoices ${where}
     ORDER BY ${orderBy}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM invoices ${where}`,
    countParams
  );

  return {
    items: rows.map(mapInvoiceRow),
    total: countRows[0]?.total ?? 0,
  };
}

export async function updateInvoice(invoiceId, userId, payload) {
  const existing = await findInvoiceByIdForUser(invoiceId, userId);
  if (!existing) return null;

  const fields = [];
  const values = [];
  let i = 1;

  const mapCol = {
    clientId: "client_id",
    invoiceNumber: "invoice_number",
    issueDate: "issue_date",
    dueDate: "due_date",
    taxRate: "tax_rate",
    taxAmount: "tax_amount",
    subtotal: "subtotal",
    total: "total",
    notes: "notes",
    lineItems: "line_items",
    currency: "currency",
  };

  if (payload.status !== undefined) {
    fields.push(`status = $${i++}`);
    values.push(normalizeStatus(payload.status));
  }

  for (const [key, col] of Object.entries(mapCol)) {
    if (payload[key] !== undefined) {
      if (key === "lineItems") {
        fields.push(`${col} = $${i++}::jsonb`);
        values.push(JSON.stringify(payload[key]));
      } else {
        fields.push(`${col} = $${i++}`);
        values.push(payload[key]);
      }
    }
  }

  if (fields.length === 0) {
    return existing;
  }

  fields.push(`updated_at = NOW()`);
  values.push(invoiceId, userId);

  const { rows } = await query(
    `UPDATE invoices SET ${fields.join(", ")}
     WHERE id = $${i++} AND user_id = $${i}
     RETURNING *`,
    values
  );
  return mapInvoiceRow(rows[0]);
}

export async function deleteInvoice(invoiceId, userId) {
  const { rowCount } = await query(`DELETE FROM invoices WHERE id = $1 AND user_id = $2`, [
    invoiceId,
    userId,
  ]);
  return rowCount > 0;
}

export async function getNextInvoiceNumber(userId, prefix = "INV") {
  const { rows } = await query(
    `SELECT invoice_number FROM invoices
     WHERE user_id = $1 AND invoice_number LIKE $2 || '-%'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, prefix]
  );
  if (!rows.length) {
    return `${prefix}-0001`;
  }
  const last = rows[0].invoice_number;
  const match = last.match(/-(\d+)$/);
  const n = match ? parseInt(match[1], 10) + 1 : 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}
