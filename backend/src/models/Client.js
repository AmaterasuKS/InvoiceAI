import { query } from "../config/database.js";

function mapClientRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createClient(userId, { name, email, phone, address, notes }) {
  const { rows } = await query(
    `INSERT INTO clients (user_id, name, email, phone, address, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, name, email, phone, address, notes, created_at, updated_at`,
    [userId, name, email ?? null, phone ?? null, address ?? null, notes ?? null]
  );
  return mapClientRow(rows[0]);
}

export async function findClientByIdForUser(clientId, userId) {
  const { rows } = await query(
    `SELECT id, user_id, name, email, phone, address, notes, created_at, updated_at
     FROM clients WHERE id = $1 AND user_id = $2`,
    [clientId, userId]
  );
  return mapClientRow(rows[0]);
}

export async function listClientsForUser(userId, { search, limit = 50, offset = 0 } = {}) {
  const params = [userId];
  let where = "WHERE user_id = $1";

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    where += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`;
  }

  params.push(Math.min(Number(limit) || 50, 200));
  params.push(Math.max(Number(offset) || 0, 0));

  const { rows } = await query(
    `SELECT id, user_id, name, email, phone, address, notes, created_at, updated_at
     FROM clients ${where}
     ORDER BY updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM clients ${where}`,
    countParams
  );

  return {
    items: rows.map(mapClientRow),
    total: countRows[0]?.total ?? 0,
  };
}

export async function updateClient(clientId, userId, payload) {
  const allowed = ["name", "email", "phone", "address", "notes"];
  const fields = [];
  const values = [];
  let i = 1;

  for (const key of allowed) {
    if (payload[key] !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push(payload[key]);
    }
  }

  if (fields.length === 0) {
    return findClientByIdForUser(clientId, userId);
  }

  fields.push(`updated_at = NOW()`);
  values.push(clientId, userId);

  const { rows } = await query(
    `UPDATE clients SET ${fields.join(", ")}
     WHERE id = $${i++} AND user_id = $${i}
     RETURNING id, user_id, name, email, phone, address, notes, created_at, updated_at`,
    values
  );
  return mapClientRow(rows[0]);
}

export async function deleteClient(clientId, userId) {
  const { rowCount } = await query(`DELETE FROM clients WHERE id = $1 AND user_id = $2`, [
    clientId,
    userId,
  ]);
  return rowCount > 0;
}
