import { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../shared/auth.middleware.js';
import { AppError } from '../../shared/errors.js';
import {
  getUserService,
  updateMeService,
  followUserService,
  unfollowUserService,
  searchUsersService,
} from './users.service.js';

export async function usersRoutes(app: FastifyInstance) {
  // GET /users/search?q=X
  app.get(
    '/users/search',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const query = (request.query as Record<string, string>)['q'];
      if (!query) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'q parameter is required' },
        });
      }

      try {
        const users = await searchUsersService(query, request.user?.id);
        return reply.send({ data: users });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );

  // GET /users/:id
  app.get(
    '/users/:id',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const user = await getUserService(id, request.user?.id);
        return reply.send({ data: user });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );

  // PUT /users/me
  app.put(
    '/users/me',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = request.body as {
        display_name?: string;
        bio?: string;
        avatar_url?: string;
      };

      try {
        const user = await updateMeService(request.user!.id, body);
        return reply.send({ data: user });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );

  // POST /users/:id/follow
  app.post(
    '/users/:id/follow',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const result = await followUserService(request.user!.id, id);
        return reply.status(200).send({ data: result });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );

  // DELETE /users/:id/follow
  app.delete(
    '/users/:id/follow',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const result = await unfollowUserService(request.user!.id, id);
        return reply.status(200).send({ data: result });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );
}
