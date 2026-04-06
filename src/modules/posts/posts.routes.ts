import { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../shared/auth.middleware.js';
import { AppError } from '../../shared/errors.js';
import {
  getPostService,
  createPostService,
  updatePostService,
  deletePostService,
} from './posts.service.js';
import {
  getCommentsService,
  createCommentService,
} from './comments.service.js';

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

  // GET /posts/:postId/comments
  app.get(
    '/posts/:postId/comments',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const { postId } = request.params as { postId: string };
      try {
        const result = await getCommentsService(
          postId,
          request.query as Record<string, string | undefined>,
          request.user?.id
        );
        return reply.send(result);
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );

  // POST /posts/:postId/comments
  app.post(
    '/posts/:postId/comments',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { postId } = request.params as { postId: string };
      try {
        const body = (request.body as Record<string, unknown>)?.body;
        const comment = await createCommentService(postId, request.user!.id, body);
        return reply.status(201).send({ data: comment });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );
}
