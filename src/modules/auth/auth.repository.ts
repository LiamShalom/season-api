import { db } from '../../shared/db.js';
import crypto from 'crypto';

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  email: string;
  password_hash: string;
  bio: string | null;
  avatar_url: string | null;
  is_founding_cook: boolean;
  created_at: string;
  updated_at: string;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return rows[0] ?? null;
}

export async function createUser(params: {
  username: string;
  display_name: string;
  email: string;
  password_hash: string;
}): Promise<UserRow> {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (username, display_name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [params.username, params.display_name, params.email, params.password_hash]
  );
  return rows[0];
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeRefreshToken(params: {
  user_id: string;
  token: string;
  expires_at: Date;
}): Promise<void> {
  const tokenHash = hashToken(params.token);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [params.user_id, tokenHash, params.expires_at]
  );
}

export async function findRefreshToken(token: string): Promise<{
  id: string;
  user_id: string;
  expires_at: string;
} | null> {
  const tokenHash = hashToken(token);
  const { rows } = await db.query<{ id: string; user_id: string; expires_at: string }>(
    `SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export async function deleteRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

export async function deleteRefreshTokenById(id: string): Promise<void> {
  await db.query('DELETE FROM refresh_tokens WHERE id = $1', [id]);
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}
