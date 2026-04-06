import { db } from '../../shared/db.js';

export interface UserPublicRow {
  id: string;
  username: string;
  display_name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  is_founding_cook: boolean;
  created_at: string;
  updated_at: string;
  follower_count: string;
  following_count: string;
  post_count: string;
  is_following?: boolean;
}

export async function findUserById(
  userId: string,
  requesterId?: string
): Promise<UserPublicRow | null> {
  const { rows } = await db.query<UserPublicRow>(
    `SELECT
       u.id, u.username, u.display_name, u.email, u.bio, u.avatar_url, u.is_founding_cook,
       u.created_at, u.updated_at,
       (SELECT COUNT(*) FROM follows WHERE followee_id = u.id)::text AS follower_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id = u.id)::text AS following_count,
       (SELECT COUNT(*) FROM posts WHERE author_id = u.id AND is_draft = false)::text AS post_count,
       ${requesterId
         ? 'EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND followee_id = u.id) AS is_following'
         : 'false AS is_following'
       }
     FROM users u
     WHERE u.id = $1`,
    requesterId ? [userId, requesterId] : [userId]
  );
  return rows[0] ?? null;
}

export async function updateUser(
  userId: string,
  fields: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
  }
): Promise<UserPublicRow | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (fields.display_name !== undefined) {
    updates.push(`display_name = $${idx++}`);
    values.push(fields.display_name);
  }
  if (fields.bio !== undefined) {
    updates.push(`bio = $${idx++}`);
    values.push(fields.bio);
  }
  if (fields.avatar_url !== undefined) {
    updates.push(`avatar_url = $${idx++}`);
    values.push(fields.avatar_url);
  }

  if (updates.length === 0) return findUserById(userId);

  updates.push(`updated_at = now()`);
  values.push(userId);

  const { rows } = await db.query<{ id: string }>(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id`,
    values
  );

  if (!rows[0]) return null;
  return findUserById(userId);
}

export async function followUser(followerId: string, followeeId: string): Promise<void> {
  await db.query(
    `INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [followerId, followeeId]
  );
}

export async function unfollowUser(followerId: string, followeeId: string): Promise<void> {
  await db.query(
    `DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2`,
    [followerId, followeeId]
  );
}

export async function searchUsers(
  query: string,
  requesterId?: string
): Promise<UserPublicRow[]> {
  const { rows } = await db.query<UserPublicRow>(
    `SET LOCAL pg_trgm.similarity_threshold = 0.15;
     SELECT
       u.id, u.username, u.display_name, u.email, u.bio, u.avatar_url, u.is_founding_cook,
       u.created_at, u.updated_at,
       (SELECT COUNT(*) FROM follows WHERE followee_id = u.id)::text AS follower_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id = u.id)::text AS following_count,
       (SELECT COUNT(*) FROM posts WHERE author_id = u.id AND is_draft = false)::text AS post_count,
       ${requesterId
         ? 'EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND followee_id = u.id) AS is_following'
         : 'false AS is_following'
       }
     FROM users u
     WHERE u.username % $1 OR u.display_name ILIKE $3
     ORDER BY similarity(u.username, $1) DESC
     LIMIT 20`,
    requesterId
      ? [query, requesterId, `%${query}%`]
      : [query, `%${query}%`]
  );
  // Note: SET LOCAL in a multi-statement is tricky with pg driver — use a transaction
  return rows;
}

export async function searchUsersInTransaction(
  query: string,
  requesterId?: string
): Promise<UserPublicRow[]> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL pg_trgm.similarity_threshold = 0.15`);

    const isFollowingExpr = requesterId
      ? 'EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND followee_id = u.id) AS is_following'
      : 'false AS is_following';

    const params = requesterId ? [query, requesterId, `%${query}%`] : [query, `%${query}%`];
    const likeParam = requesterId ? '$3' : '$2';

    const { rows } = await client.query<UserPublicRow>(
      `SELECT
         u.id, u.username, u.display_name, u.email, u.bio, u.avatar_url, u.is_founding_cook,
         u.created_at, u.updated_at,
         (SELECT COUNT(*) FROM follows WHERE followee_id = u.id)::text AS follower_count,
         (SELECT COUNT(*) FROM follows WHERE follower_id = u.id)::text AS following_count,
         (SELECT COUNT(*) FROM posts WHERE author_id = u.id AND is_draft = false)::text AS post_count,
         ${isFollowingExpr}
       FROM users u
       WHERE u.username % $1 OR u.display_name ILIKE ${likeParam}
       ORDER BY similarity(u.username, $1) DESC
       LIMIT 20`,
      params
    );

    await client.query('COMMIT');
    return rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
