import { FastifyInstance } from 'fastify';
import { optionalAuth } from '../../shared/auth.middleware.js';
import { AppError } from '../../shared/errors.js';
import { parsePagination } from '../../shared/pagination.js';
import { searchPosts } from '../posts/posts.repository.js';

const HARDCODED_CUISINES = [
  { name: 'Italian', tag_category: 'cuisine' },
  { name: 'Mexican', tag_category: 'cuisine' },
  { name: 'Japanese', tag_category: 'cuisine' },
  { name: 'Chinese', tag_category: 'cuisine' },
  { name: 'Indian', tag_category: 'cuisine' },
  { name: 'Thai', tag_category: 'cuisine' },
  { name: 'French', tag_category: 'cuisine' },
  { name: 'Mediterranean', tag_category: 'cuisine' },
  { name: 'American', tag_category: 'cuisine' },
  { name: 'Korean', tag_category: 'cuisine' },
  { name: 'Middle Eastern', tag_category: 'cuisine' },
  { name: 'Greek', tag_category: 'cuisine' },
  { name: 'Vietnamese', tag_category: 'cuisine' },
  { name: 'Spanish', tag_category: 'cuisine' },
  { name: 'Ethiopian', tag_category: 'cuisine' },
];

export async function discoveryRoutes(app: FastifyInstance) {
  // GET /discovery/trending — stub
  app.get(
    '/discovery/trending',
    { preHandler: [optionalAuth] },
    async (_request, reply) => {
      // TODO: Implement trending algorithm
      return reply.send({ data: [] });
    }
  );

  // GET /discovery/cuisines — hardcoded list
  app.get(
    '/discovery/cuisines',
    async (_request, reply) => {
      return reply.send({ data: HARDCODED_CUISINES });
    }
  );

  // GET /search?q=X&page=Y
  app.get(
    '/search',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const query = (request.query as Record<string, string>)['q'];

      if (!query || query.trim().length === 0) {
        return reply.send({
          data: [],
          pagination: { page: 1, page_size: 20, total: 0, total_pages: 0, has_next_page: false },
        });
      }

      try {
        const params = parsePagination(request.query as Record<string, string>);
        const { posts, total } = await searchPosts({
          query: query.trim(),
          limit: params.pageSize,
          offset: (params.page - 1) * params.pageSize,
          requesterId: request.user?.id,
        });

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

        const totalPages = Math.ceil(total / params.pageSize);
        return reply.send({
          data: formattedPosts,
          pagination: {
            page: params.page,
            page_size: params.pageSize,
            total,
            total_pages: totalPages,
            has_next_page: params.page < totalPages,
          },
        });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );
}
