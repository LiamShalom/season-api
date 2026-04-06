import { getPublicFeed, getUserFeed } from '../posts/posts.repository.js';
import { parsePagination, toOffset, buildPaginatedResponse } from '../../shared/pagination.js';

export async function getPublicFeedService(
  query: Record<string, string | undefined>,
  requesterId?: string
) {
  const params = parsePagination(query);
  const { limit, offset } = toOffset(params);
  const { posts, total } = await getPublicFeed({ limit, offset, requesterId });

  const formattedPosts = posts.map((p) => ({
    id: p.id,
    author_id: p.author_id,
    author: {
      id: p.author_id,
      username: p.author_username,
      display_name: p.author_display_name,
      avatar_url: p.author_avatar_url,
      is_founding_cook: p.author_is_founding_cook,
    },
    dish_name: p.dish_name,
    notes: p.notes,
    photo_urls: p.photo_urls,
    star_rating: parseFloat(p.star_rating),
    visibility: p.visibility,
    is_draft: p.is_draft,
    adapted_from_url: p.adapted_from_url,
    reaction_counts: p.reaction_counts,
    user_reaction: p.user_reaction,
    tags: p.tags,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  return buildPaginatedResponse(formattedPosts, total, params);
}

export async function getUserFeedService(
  userId: string,
  query: Record<string, string | undefined>,
  requesterId?: string
) {
  const params = parsePagination(query);
  const { limit, offset } = toOffset(params);
  const { posts, total } = await getUserFeed({ userId, limit, offset, requesterId });

  const formattedPosts = posts.map((p) => ({
    id: p.id,
    author_id: p.author_id,
    author: {
      id: p.author_id,
      username: p.author_username,
      display_name: p.author_display_name,
      avatar_url: p.author_avatar_url,
      is_founding_cook: p.author_is_founding_cook,
    },
    dish_name: p.dish_name,
    notes: p.notes,
    photo_urls: p.photo_urls,
    star_rating: parseFloat(p.star_rating),
    visibility: p.visibility,
    is_draft: p.is_draft,
    adapted_from_url: p.adapted_from_url,
    reaction_counts: p.reaction_counts,
    user_reaction: p.user_reaction,
    tags: p.tags,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  return buildPaginatedResponse(formattedPosts, total, params);
}
