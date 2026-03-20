import {
  createClient,
  findClientByIdForUser,
  listClientsForUser,
  updateClient as updateClientModel,
  deleteClient as deleteClientModel,
} from "../models/Client.js";
import { query } from "../config/database.js";

async function getInvoiceStatsForClient(userId, clientId) {
  const { rows } = await query(
    `SELECT
       COUNT(*)::int AS invoice_count,
       COALESCE(SUM(total), 0)::numeric(14,2) AS lifetime_total,
       COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)::numeric(14,2) AS paid_total,
       COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue', 'draft') THEN total ELSE 0 END), 0)::numeric(14,2) AS outstanding_total,
       COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0)::numeric(14,2) AS overdue_total,
       COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0)::int AS draft_count,
       COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0)::int AS sent_count,
       COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0)::int AS paid_count,
       COALESCE(SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END), 0)::int AS overdue_count
     FROM invoices
     WHERE user_id = $1 AND client_id = $2`,
    [userId, clientId]
  );
  const r = rows[0];
  return {
    invoiceCount: r.invoice_count,
    lifetimeTotal: Number(r.lifetime_total),
    paidTotal: Number(r.paid_total),
    outstandingTotal: Number(r.outstanding_total),
    overdueTotal: Number(r.overdue_total),
    byStatus: {
      draft: r.draft_count,
      sent: r.sent_count,
      paid: r.paid_count,
      overdue: r.overdue_count,
    },
  };
}

function validateName(name) {
  if (!name || typeof name !== "string" || !name.trim()) {
    return "Укажите название или имя клиента";
  }
  return null;
}

export async function listClients(req, res, next) {
  try {
    const { search, limit, offset } = req.query;
    const result = await listClientsForUser(req.userId, {
      search: search ?? undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
      offset: offset !== undefined ? Number(offset) : undefined,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getClient(req, res, next) {
  try {
    const { id } = req.params;
    const client = await findClientByIdForUser(id, req.userId);
    if (!client) {
      return res.status(404).json({ message: "Клиент не найден" });
    }
    const analytics = await getInvoiceStatsForClient(req.userId, id);
    return res.json({ client, analytics });
  } catch (err) {
    next(err);
  }
}

export async function createClientHandler(req, res, next) {
  try {
    const { name, email, phone, address, notes } = req.body ?? {};
    const nameErr = validateName(name);
    if (nameErr) return res.status(400).json({ message: nameErr });

    const client = await createClient(req.userId, {
      name: name.trim(),
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      notes: notes ?? null,
    });
    return res.status(201).json({ client });
  } catch (err) {
    next(err);
  }
}

export async function updateClientHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, phone, address, notes } = req.body ?? {};

    const existing = await findClientByIdForUser(id, req.userId);
    if (!existing) {
      return res.status(404).json({ message: "Клиент не найден" });
    }

    if (name !== undefined) {
      const nameErr = validateName(name);
      if (nameErr) return res.status(400).json({ message: nameErr });
    }

    const patch = {};
    if (name !== undefined) patch.name = name.trim();
    if (email !== undefined) patch.email = email;
    if (phone !== undefined) patch.phone = phone;
    if (address !== undefined) patch.address = address;
    if (notes !== undefined) patch.notes = notes;

    const client = await updateClientModel(id, req.userId, patch);
    return res.json({ client });
  } catch (err) {
    next(err);
  }
}

export async function deleteClientHandler(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await findClientByIdForUser(id, req.userId);
    if (!existing) {
      return res.status(404).json({ message: "Клиент не найден" });
    }

    try {
      const removed = await deleteClientModel(id, req.userId);
      if (!removed) {
        return res.status(404).json({ message: "Клиент не найден" });
      }
      return res.status(204).send();
    } catch (err) {
      if (err.code === "23503") {
        return res.status(409).json({
          message:
            "Нельзя удалить клиента: есть связанные инвойсы. Сначала удалите или переназначьте их.",
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}
