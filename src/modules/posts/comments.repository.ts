import { db } from '../../shared/db.js';

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
  author_is_founding_cook: boolean;
}

const COMMENT_SELECT = `
  c.id, c.post_id, c.author_id, c.body, c.created_at, c.updated_at,
  u.username AS author_username,
  u.display_name AS author_display_name,
  u.avatar_url AS author_avatar_url,
  u.is_founding_cook AS author_is_founding_cook
`;

export async function getCommentsByPostId(
  postId: string,
  limit: number,
  offset: number
): Promise<{ comments: CommentRow[]; total: number }> {
  const [{ rows: comments }, { rows: countRows }] = await Promise.all([
    db.query<CommentRow>(
      `SELECT ${COMMENT_SELECT}
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM comments WHERE post_id = $1`,
      [postId]
    ),
  ]);

  return {
    comments,
    total: parseInt(countRows[0]?.count ?? '0', 10),
  };
}

export async function createComment(
  postId: string,
  authorId: string,
  body: string
): Promise<CommentRow> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO comments (post_id, author_id, body)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [postId, authorId, body]
  );

  const { rows: full } = await db.query<CommentRow>(
    `SELECT ${COMMENT_SELECT}
     FROM comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.id = $1`,
    [rows[0].id]
  );

  return full[0];
}
