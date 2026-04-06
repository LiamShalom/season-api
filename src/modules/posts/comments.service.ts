import { Errors } from '../../shared/errors.js';
import { parsePagination, toOffset, buildPaginatedResponse } from '../../shared/pagination.js';
import { findPostById } from './posts.repository.js';
import { getCommentsByPostId, createComment, CommentRow } from './comments.repository.js';

function formatComment(comment: CommentRow) {
  return {
    id: comment.id,
    post_id: comment.post_id,
    author_id: comment.author_id,
    author: {
      id: comment.author_id,
      username: comment.author_username,
      display_name: comment.author_display_name,
      avatar_url: comment.author_avatar_url,
      is_founding_cook: comment.author_is_founding_cook,
    },
    body: comment.body,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
  };
}

async function assertPostVisible(postId: string, requesterId?: string) {
  const post = await findPostById(postId, requesterId);
  if (!post) throw Errors.NOT_FOUND('Post');
  if (post.visibility !== 'public' && post.author_id !== requesterId) {
    throw Errors.NOT_FOUND('Post');
  }
}

export async function getCommentsService(
  postId: string,
  query: Record<string, string | undefined>,
  requesterId?: string
) {
  await assertPostVisible(postId, requesterId);

  const pagination = parsePagination(query, { pageSize: 20 });
  const { limit, offset } = toOffset(pagination);
  const { comments, total } = await getCommentsByPostId(postId, limit, offset);

  return buildPaginatedResponse(comments.map(formatComment), total, pagination);
}

export async function createCommentService(
  postId: string,
  authorId: string,
  body: unknown
) {
  if (typeof body !== 'string' || body.trim().length === 0) {
    throw Errors.VALIDATION_ERROR('body is required');
  }
  if (body.trim().length > 1000) {
    throw Errors.VALIDATION_ERROR('body must be 1000 characters or fewer');
  }

  await assertPostVisible(postId, authorId);

  const comment = await createComment(postId, authorId, body.trim());
  return formatComment(comment);
}
