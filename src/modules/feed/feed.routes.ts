import { FastifyInstance } from 'fastify';
import { optionalAuth } from '../../shared/auth.middleware.js';
import { AppError } from '../../shared/errors.js';
import { getPublicFeedService, getUserFeedService } from './feed.service.js';

export async function feedRoutes(app: FastifyInstance) {
  // GET /feed?page=X&pageSize=Y
  app.get(
    '/feed',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      try {
        const result = await getPublicFeedService(
          request.query as Record<string, string>,
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

  // GET /users/:userId/feed?page=X
  app.get(
    '/users/:userId/feed',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      try {
        const result = await getUserFeedService(
          userId,
          request.query as Record<string, string>,
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
}
