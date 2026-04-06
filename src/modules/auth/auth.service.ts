import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';
import { Errors } from '../../shared/errors.js';
import {
  findUserByEmail,
  findUserByUsername,
  createUser,
  storeRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteRefreshTokenById,
  findUserById,
  UserRow,
} from './auth.repository.js';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_DAYS = 7;

function formatUser(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    email: user.email,
    bio: user.bio,
    avatar_url: user.avatar_url,
    is_founding_cook: user.is_founding_cook,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function refreshExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return d;
}

export async function signupService(
  app: FastifyInstance,
  params: { username: string; display_name: string; email: string; password: string }
) {
  const [existingEmail, existingUsername] = await Promise.all([
    findUserByEmail(params.email),
    findUserByUsername(params.username),
  ]);

  if (existingEmail) {
    throw Errors.CONFLICT('An account with this email already exists');
  }
  if (existingUsername) {
    throw Errors.CONFLICT('Username is already taken');
  }

  const password_hash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
  const user = await createUser({
    username: params.username,
    display_name: params.display_name,
    email: params.email,
    password_hash,
  });

  const accessToken = app.jwt.sign(
    { id: user.id, username: user.username },
    { expiresIn: '15m' }
  );

  const refreshToken = app.jwt.sign(
    { id: user.id, username: user.username },
    { expiresIn: '7d' }
  );

  await storeRefreshToken({
    user_id: user.id,
    token: refreshToken,
    expires_at: refreshExpiresAt(),
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: formatUser(user),
  };
}

export async function loginService(
  app: FastifyInstance,
  params: { email: string; password: string }
) {
  const user = await findUserByEmail(params.email);
  if (!user) {
    throw Errors.INVALID_CREDENTIALS();
  }

  const passwordMatch = await bcrypt.compare(params.password, user.password_hash);
  if (!passwordMatch) {
    throw Errors.INVALID_CREDENTIALS();
  }

  const accessToken = app.jwt.sign(
    { id: user.id, username: user.username },
    { expiresIn: '15m' }
  );

  const refreshToken = app.jwt.sign(
    { id: user.id, username: user.username },
    { expiresIn: '7d' }
  );

  await storeRefreshToken({
    user_id: user.id,
    token: refreshToken,
    expires_at: refreshExpiresAt(),
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: formatUser(user),
  };
}

export async function refreshService(
  app: FastifyInstance,
  params: { refresh_token: string }
) {
  const storedToken = await findRefreshToken(params.refresh_token);
  if (!storedToken) {
    throw Errors.INVALID_REFRESH_TOKEN();
  }

  if (new Date(storedToken.expires_at) < new Date()) {
    await deleteRefreshTokenById(storedToken.id);
    throw Errors.INVALID_REFRESH_TOKEN();
  }

  const user = await findUserById(storedToken.user_id);
  if (!user) {
    await deleteRefreshTokenById(storedToken.id);
    throw Errors.INVALID_REFRESH_TOKEN();
  }

  // Rotate refresh token
  await deleteRefreshTokenById(storedToken.id);

  const newAccessToken = app.jwt.sign(
    { id: user.id, username: user.username },
    { expiresIn: '15m' }
  );

  const newRefreshToken = app.jwt.sign(
    { id: user.id, username: user.username },
    { expiresIn: '7d' }
  );

  await storeRefreshToken({
    user_id: user.id,
    token: newRefreshToken,
    expires_at: refreshExpiresAt(),
  });

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
  };
}

export async function logoutService(params: { refresh_token: string }) {
  await deleteRefreshToken(params.refresh_token);
}
