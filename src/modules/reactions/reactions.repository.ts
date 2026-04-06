import { db } from '../../shared/db.js';

export type ReactionType = 'love_it' | 'want_to_try' | 'made_it';

export interface ReactionRow {
  id: string;
  user_id: string;
  post_id: string;
  type: ReactionType;
  created_at: string;
}

export async function upsertReaction(params: {
  user_id: string;
  post_id: string;
  type: ReactionType;
}): Promise<ReactionRow> {
  const { rows } = await db.query<ReactionRow>(
    `INSERT INTO reactions (user_id, post_id, type)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, post_id) DO UPDATE SET type = EXCLUDED.type
     RETURNING *`,
    [params.user_id, params.post_id, params.type]
  );
  return rows[0];
}

export async function deleteReaction(userId: string, postId: string): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    'DELETE FROM reactions WHERE user_id = $1 AND post_id = $2 RETURNING id',
    [userId, postId]
  );
  return rows.length > 0;
}
