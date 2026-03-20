import { query } from "../config/database.js";

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    companyName: row.company_name,
    companyLogoUrl: row.company_logo_url,
    companyDetails: row.company_details ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createUser({ email, passwordHash, companyName = null }) {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, company_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, password_hash, company_name, company_logo_url, company_details, created_at, updated_at`,
    [email.toLowerCase().trim(), passwordHash, companyName]
  );
  return mapUserRow(rows[0]);
}

export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, password_hash, company_name, company_logo_url, company_details, created_at, updated_at
     FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return mapUserRow(rows[0]);
}

export async function findUserById(id) {
  const { rows } = await query(
    `SELECT id, email, password_hash, company_name, company_logo_url, company_details, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
  return mapUserRow(rows[0]);
}

export async function updateUserProfile(userId, { companyName, companyLogoUrl, companyDetails }) {
  const fields = [];
  const values = [];
  let i = 1;

  if (companyName !== undefined) {
    fields.push(`company_name = $${i++}`);
    values.push(companyName);
  }
  if (companyLogoUrl !== undefined) {
    fields.push(`company_logo_url = $${i++}`);
    values.push(companyLogoUrl);
  }
  if (companyDetails !== undefined) {
    fields.push(`company_details = $${i++}::jsonb`);
    values.push(JSON.stringify(companyDetails));
  }

  if (fields.length === 0) {
    return findUserById(userId);
  }

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  const { rows } = await query(
    `UPDATE users SET ${fields.join(", ")}
     WHERE id = $${i}
     RETURNING id, email, password_hash, company_name, company_logo_url, company_details, created_at, updated_at`,
    values
  );
  return mapUserRow(rows[0]);
}

/** Публичное представление пользователя (без пароля) */
export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash: _p, ...rest } = user;
  return rest;
}
