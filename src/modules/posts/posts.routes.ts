import { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../shared/auth.middleware.js';
import { AppError } from '../../shared/errors.js';
import {
  getPostService,
  createPostService,
  updatePostService,
  deletePostService,
} from './posts.service.js';

export async function postsRoutes(app: FastifyInstance) {
  // POST /posts
  app.post(
    '/posts',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const post = await createPostService(
          request.user!.id,
          request.body as Record<string, unknown>
        );
        return reply.status(201).send({ data: post });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );

  // GET /posts/:id
  app.get(
    '/posts/:id',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const post = await getPostService(id, request.user?.id);
        return reply.send({ data: post });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );

  // PUT /posts/:id
  app.put(
    '/posts/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const post = await updatePostService(
          id,
          request.user!.id,
          request.body as Record<string, unknown>
        );
        return reply.send({ data: post });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );

  // DELETE /posts/:id
  app.delete(
    '/posts/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const result = await deletePostService(id, request.user!.id);
        return reply.send({ data: result });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );

  // GET /posts/:postId/comments — stub
  app.get(
    '/posts/:postId/comments',
    { preHandler: [optionalAuth] },
    async (_request, reply) => {
      // TODO: Implement comments feature
      return reply.send({
        data: [],
        pagination: {
          page: 1,
          page_size: 20,
          total: 0,
          total_pages: 0,
          has_next_page: false,
        },
      });
    }
  );

  // POST /posts/:postId/comments — stub
  app.post(
    '/posts/:postId/comments',
    { preHandler: [requireAuth] },
    async (_request, reply) => {
      // TODO: Implement comments feature
      return reply.status(501).send({
        error: { code: 'NOT_IMPLEMENTED', message: 'Comments coming soon' },
      });
    }
  );
}
