import { Errors } from '../../shared/errors.js';
import {
  findPostById,
  createPost,
  updatePost,
  deletePost,
  PostWithExtras,
} from './posts.repository.js';

const R2_PUBLIC_URL = () => process.env.R2_PUBLIC_URL ?? '';

function validatePhotoUrls(urls: string[]) {
  const base = R2_PUBLIC_URL();
  if (!base) return; // Skip validation if not configured
  for (const url of urls) {
    if (!url.startsWith(base)) {
      throw Errors.VALIDATION_ERROR(`Photo URL must be a valid R2 media URL: ${url}`);
    }
  }
}

function formatPost(post: PostWithExtras) {
  return {
    id: post.id,
    author_id: post.author_id,
    author: {
      id: post.author_id,
      username: post.author_username,
      display_name: post.author_display_name,
      avatar_url: post.author_avatar_url,
      is_founding_cook: post.author_is_founding_cook,
    },
    dish_name: post.dish_name,
    notes: post.notes,
    photo_urls: post.photo_urls,
    star_rating: parseFloat(post.star_rating),
    visibility: post.visibility,
    is_draft: post.is_draft,
    adapted_from_url: post.adapted_from_url,
    reaction_counts: post.reaction_counts,
    user_reaction: post.user_reaction,
    tags: post.tags,
    created_at: post.created_at,
    updated_at: post.updated_at,
  };
}

export async function getPostService(postId: string, requesterId?: string) {
  const post = await findPostById(postId, requesterId);
  if (!post) throw Errors.NOT_FOUND('Post');
  // Non-public posts only visible to author
  if (post.visibility !== 'public' && post.author_id !== requesterId) {
    throw Errors.NOT_FOUND('Post');
  }
  return formatPost(post);
}

export async function createPostService(
  authorId: string,
  body: {
    dish_name?: string;
    notes?: string;
    photo_urls?: string[];
    star_rating?: number;
    visibility?: string;
    is_draft?: boolean;
    adapted_from_url?: string;
    tag_ids?: string[];
  }
) {
  if (!body.dish_name) throw Errors.VALIDATION_ERROR('dish_name is required');
  if (body.star_rating === undefined) throw Errors.VALIDATION_ERROR('star_rating is required');
  if (body.star_rating < 0.5 || body.star_rating > 5.0) {
    throw Errors.VALIDATION_ERROR('star_rating must be between 0.5 and 5.0');
  }
  if (!body.photo_urls || body.photo_urls.length === 0) {
    throw Errors.VALIDATION_ERROR('At least one photo_url is required');
  }

  const visibility = body.visibility ?? 'public';
  if (!['public', 'friends', 'private'].includes(visibility)) {
    throw Errors.VALIDATION_ERROR('visibility must be public, friends, or private');
  }

  validatePhotoUrls(body.photo_urls);

  const post = await createPost({
    author_id: authorId,
    dish_name: body.dish_name,
    notes: body.notes,
    photo_urls: body.photo_urls,
    star_rating: body.star_rating,
    visibility,
    is_draft: body.is_draft ?? false,
    adapted_from_url: body.adapted_from_url,
    tag_ids: body.tag_ids,
  });

  return formatPost(post);
}

export async function updatePostService(
  postId: string,
  authorId: string,
  body: {
    dish_name?: string;
    notes?: string;
    photo_urls?: string[];
    star_rating?: number;
    visibility?: string;
    is_draft?: boolean;
    adapted_from_url?: string;
    tag_ids?: string[];
  }
) {
  const existing = await findPostById(postId);
  if (!existing) throw Errors.NOT_FOUND('Post');
  if (existing.author_id !== authorId) throw Errors.FORBIDDEN('You do not own this post');

  if (body.star_rating !== undefined && (body.star_rating < 0.5 || body.star_rating > 5.0)) {
    throw Errors.VALIDATION_ERROR('star_rating must be between 0.5 and 5.0');
  }

  if (body.visibility && !['public', 'friends', 'private'].includes(body.visibility)) {
    throw Errors.VALIDATION_ERROR('visibility must be public, friends, or private');
  }

  if (body.photo_urls) {
    if (body.photo_urls.length === 0) {
      throw Errors.VALIDATION_ERROR('At least one photo_url is required');
    }
    validatePhotoUrls(body.photo_urls);
  }

  const post = await updatePost(postId, authorId, body);
  if (!post) throw Errors.NOT_FOUND('Post');
  return formatPost(post);
}

export async function deletePostService(postId: string, authorId: string) {
  const existing = await findPostById(postId);
  if (!existing) throw Errors.NOT_FOUND('Post');
  if (existing.author_id !== authorId) throw Errors.FORBIDDEN('You do not own this post');
  const deleted = await deletePost(postId, authorId);
  if (!deleted) throw Errors.NOT_FOUND('Post');
  return { deleted: true };
}
