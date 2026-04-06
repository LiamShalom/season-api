import { Errors } from '../../shared/errors.js';
import {
  findUserById,
  updateUser,
  followUser,
  unfollowUser,
  searchUsersInTransaction,
  UserPublicRow,
} from './users.repository.js';

function formatUser(user: UserPublicRow) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    email: user.email,
    bio: user.bio,
    avatar_url: user.avatar_url,
    is_founding_cook: user.is_founding_cook,
    follower_count: parseInt(user.follower_count, 10),
    following_count: parseInt(user.following_count, 10),
    post_count: parseInt(user.post_count, 10),
    is_following: user.is_following ?? false,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function getUserService(userId: string, requesterId?: string) {
  const user = await findUserById(userId, requesterId);
  if (!user) throw Errors.NOT_FOUND('User');
  return formatUser(user);
}

export async function updateMeService(
  requesterId: string,
  fields: { display_name?: string; bio?: string; avatar_url?: string }
) {
  const r2PublicUrl = process.env.R2_PUBLIC_URL ?? '';
  if (fields.avatar_url && r2PublicUrl && !fields.avatar_url.startsWith(r2PublicUrl)) {
    throw Errors.VALIDATION_ERROR('avatar_url must be a valid R2 media URL');
  }

  const user = await updateUser(requesterId, fields);
  if (!user) throw Errors.NOT_FOUND('User');
  return formatUser(user);
}

export async function followUserService(requesterId: string, targetId: string) {
  if (requesterId === targetId) {
    throw Errors.VALIDATION_ERROR('You cannot follow yourself');
  }
  const target = await findUserById(targetId);
  if (!target) throw Errors.NOT_FOUND('User');
  await followUser(requesterId, targetId);
  return { followed: true };
}

export async function unfollowUserService(requesterId: string, targetId: string) {
  await unfollowUser(requesterId, targetId);
  return { followed: false };
}

export async function searchUsersService(query: string, requesterId?: string) {
  if (!query || query.trim().length < 1) return [];
  const users = await searchUsersInTransaction(query.trim(), requesterId);
  return users.map(formatUser);
}
