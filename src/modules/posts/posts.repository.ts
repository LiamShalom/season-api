import { db } from '../../shared/db.js';

export interface PostRow {
  id: string;
  author_id: string;
  dish_name: string;
  notes: string | null;
  photo_urls: string[];
  star_rating: string;
  visibility: 'public' | 'friends' | 'private';
  is_draft: boolean;
  adapted_from_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostWithExtras extends PostRow {
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
  author_is_founding_cook: boolean;
  reaction_counts: Record<string, number>;
  user_reaction: string | null;
  tags: Array<{ id: string; name: string; category: string }>;
}

const POST_SELECT = `
  p.id, p.author_id, p.dish_name, p.notes, p.photo_urls, p.star_rating,
  p.visibility, p.is_draft, p.adapted_from_url, p.created_at, p.updated_at,
  u.username AS author_username,
  u.display_name AS author_display_name,
  u.avatar_url AS author_avatar_url,
  u.is_founding_cook AS author_is_founding_cook
`;

async function attachExtras(
  posts: (PostRow & {
    author_username: string;
    author_display_name: string;
    author_avatar_url: string | null;
    author_is_founding_cook: boolean;
  })[],
  requesterId?: string
): Promise<PostWithExtras[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  // Reaction counts
  const { rows: reactionRows } = await db.query<{
    post_id: string;
    type: string;
    count: string;
  }>(
    `SELECT post_id, type, COUNT(*)::text AS count FROM reactions WHERE post_id = ANY($1) GROUP BY post_id, type`,
    [postIds]
  );

  const reactionMap: Record<string, Record<string, number>> = {};
  for (const row of reactionRows) {
    if (!reactionMap[row.post_id]) reactionMap[row.post_id] = {};
    reactionMap[row.post_id][row.type] = parseInt(row.count, 10);
  }

  // User reactions
  let userReactionMap: Record<string, string> = {};
  if (requesterId) {
    const { rows: userReactionRows } = await db.query<{ post_id: string; type: string }>(
      `SELECT post_id, type FROM reactions WHERE post_id = ANY($1) AND user_id = $2`,
      [postIds, requesterId]
    );
    for (const row of userReactionRows) {
      userReactionMap[row.post_id] = row.type;
    }
  }

  // Tags
  const { rows: tagRows } = await db.query<{
    post_id: string;
    tag_id: string;
    name: string;
    category: string;
  }>(
    `SELECT pt.post_id, t.id AS tag_id, t.name, t.category
     FROM post_tags pt
     JOIN tags t ON t.id = pt.tag_id
     WHERE pt.post_id = ANY($1)`,
    [postIds]
  );

  const tagMap: Record<string, Array<{ id: string; name: string; category: string }>> = {};
  for (const row of tagRows) {
    if (!tagMap[row.post_id]) tagMap[row.post_id] = [];
    tagMap[row.post_id].push({ id: row.tag_id, name: row.name, category: row.category });
  }

  return posts.map((p) => ({
    ...p,
    reaction_counts: reactionMap[p.id] ?? {},
    user_reaction: userReactionMap[p.id] ?? null,
    tags: tagMap[p.id] ?? [],
  }));
}

export async function findPostById(
  postId: string,
  requesterId?: string
): Promise<PostWithExtras | null> {
  const { rows } = await db.query(
    `SELECT ${POST_SELECT} FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = $1`,
    [postId]
  );
  if (!rows[0]) return null;
  const [result] = await attachExtras([rows[0]], requesterId);
  return result ?? null;
}

export async function createPost(params: {
  author_id: string;
  dish_name: string;
  notes?: string;
  photo_urls: string[];
  star_rating: number;
  visibility: string;
  is_draft: boolean;
  adapted_from_url?: string;
  tag_ids?: string[];
}): Promise<PostWithExtras> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<PostRow>(
      `INSERT INTO posts (author_id, dish_name, notes, photo_urls, star_rating, visibility, is_draft, adapted_from_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        params.author_id,
        params.dish_name,
        params.notes ?? null,
        params.photo_urls,
        params.star_rating,
        params.visibility,
        params.is_draft,
        params.adapted_from_url ?? null,
      ]
    );

    const post = rows[0];

    if (params.tag_ids && params.tag_ids.length > 0) {
      const tagValues = params.tag_ids.map((_tagId, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO post_tags (post_id, tag_id) VALUES ${tagValues} ON CONFLICT DO NOTHING`,
        [post.id, ...params.tag_ids]
      );
    }

    await client.query('COMMIT');

    const result = await findPostById(post.id, params.author_id);
    return result!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updatePost(
  postId: string,
  authorId: string,
  fields: {
    dish_name?: string;
    notes?: string;
    photo_urls?: string[];
    star_rating?: number;
    visibility?: string;
    is_draft?: boolean;
    adapted_from_url?: string;
    tag_ids?: string[];
  }
): Promise<PostWithExtras | null> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (fields.dish_name !== undefined) { updates.push(`dish_name = $${idx++}`); values.push(fields.dish_name); }
    if (fields.notes !== undefined) { updates.push(`notes = $${idx++}`); values.push(fields.notes); }
    if (fields.photo_urls !== undefined) { updates.push(`photo_urls = $${idx++}`); values.push(fields.photo_urls); }
    if (fields.star_rating !== undefined) { updates.push(`star_rating = $${idx++}`); values.push(fields.star_rating); }
    if (fields.visibility !== undefined) { updates.push(`visibility = $${idx++}`); values.push(fields.visibility); }
    if (fields.is_draft !== undefined) { updates.push(`is_draft = $${idx++}`); values.push(fields.is_draft); }
    if (fields.adapted_from_url !== undefined) { updates.push(`adapted_from_url = $${idx++}`); values.push(fields.adapted_from_url); }

    if (updates.length > 0) {
      updates.push(`updated_at = now()`);
      values.push(postId, authorId);
      const { rows } = await client.query<{ id: string }>(
        `UPDATE posts SET ${updates.join(', ')} WHERE id = $${idx++} AND author_id = $${idx++} RETURNING id`,
        values
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
    }

    if (fields.tag_ids !== undefined) {
      await client.query('DELETE FROM post_tags WHERE post_id = $1', [postId]);
      if (fields.tag_ids.length > 0) {
        const tagValues = fields.tag_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO post_tags (post_id, tag_id) VALUES ${tagValues} ON CONFLICT DO NOTHING`,
          [postId, ...fields.tag_ids]
        );
      }
    }

    await client.query('COMMIT');
    return findPostById(postId, authorId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deletePost(postId: string, authorId: string): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    'DELETE FROM posts WHERE id = $1 AND author_id = $2 RETURNING id',
    [postId, authorId]
  );
  return rows.length > 0;
}

export async function getPublicFeed(params: {
  limit: number;
  offset: number;
  requesterId?: string;
}): Promise<{ posts: PostWithExtras[]; total: number }> {
  const [{ rows: posts }, { rows: countRows }] = await Promise.all([
    db.query(
      `SELECT ${POST_SELECT}
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.is_draft = false AND p.visibility = 'public'
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [params.limit, params.offset]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM posts WHERE is_draft = false AND visibility = 'public'`
    ),
  ]);

  return {
    posts: await attachExtras(posts, params.requesterId),
    total: parseInt(countRows[0]?.count ?? '0', 10),
  };
}

export async function getUserFeed(params: {
  userId: string;
  limit: number;
  offset: number;
  requesterId?: string;
}): Promise<{ posts: PostWithExtras[]; total: number }> {
  const [{ rows: posts }, { rows: countRows }] = await Promise.all([
    db.query(
      `SELECT ${POST_SELECT}
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.author_id = $1 AND p.is_draft = false
         AND (p.visibility = 'public' OR p.author_id = $3)
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $4`,
      [params.userId, params.limit, params.requesterId ?? params.userId, params.offset]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM posts
       WHERE author_id = $1 AND is_draft = false
         AND (visibility = 'public' OR author_id = $2)`,
      [params.userId, params.requesterId ?? params.userId]
    ),
  ]);

  return {
    posts: await attachExtras(posts, params.requesterId),
    total: parseInt(countRows[0]?.count ?? '0', 10),
  };
}

export async function searchPosts(params: {
  query: string;
  limit: number;
  offset: number;
  requesterId?: string;
}): Promise<{ posts: PostWithExtras[]; total: number }> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL pg_trgm.similarity_threshold = 0.15`);

    const [{ rows: posts }, { rows: countRows }] = await Promise.all([
      client.query(
        `SELECT ${POST_SELECT}
         FROM posts p JOIN users u ON u.id = p.author_id
         WHERE p.is_draft = false AND p.visibility = 'public'
           AND (p.dish_name % $1 OR p.dish_name ILIKE $2)
         ORDER BY similarity(p.dish_name, $1) DESC, p.created_at DESC
         LIMIT $3 OFFSET $4`,
        [params.query, `%${params.query}%`, params.limit, params.offset]
      ),
      client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM posts
         WHERE is_draft = false AND visibility = 'public'
           AND (dish_name % $1 OR dish_name ILIKE $2)`,
        [params.query, `%${params.query}%`]
      ),
    ]);

    await client.query('COMMIT');

    return {
      posts: await attachExtras(posts, params.requesterId),
      total: parseInt(countRows[0]?.count ?? '0', 10),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
