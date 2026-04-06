import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { AppError } from './shared/errors.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { postsRoutes } from './modules/posts/posts.routes.js';
import { feedRoutes } from './modules/feed/feed.routes.js';
import { reactionsRoutes } from './modules/reactions/reactions.routes.js';
import { mediaRoutes } from './modules/media/media.routes.js';
import { discoveryRoutes } from './modules/discovery/discovery.routes.js';
import { recipesRoutes } from './modules/recipes/recipes.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(process.env.NODE_ENV !== 'production'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true },
            },
          }
        : {}),
    },
  });

  // Plugins
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  await app.register(fastifyMultipart, {
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  });

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  await app.register(fastifyJwt, {
    secret: jwtSecret,
  });

  // Global error handler
  app.setErrorHandler((error: Error & { statusCode?: number; validation?: unknown }, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    // Fastify validation errors
    if ('validation' in error && error.validation) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Routes
  await app.register(authRoutes);
  await app.register(usersRoutes);
  await app.register(postsRoutes);
  await app.register(feedRoutes);
  await app.register(reactionsRoutes);
  await app.register(mediaRoutes);
  await app.register(discoveryRoutes);
  await app.register(recipesRoutes);

  return app;
}
