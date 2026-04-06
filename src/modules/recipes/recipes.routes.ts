import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/auth.middleware.js';

export async function recipesRoutes(app: FastifyInstance) {
  // POST /recipes/import — stub
  // TODO: Implement recipe import via Claude API (async, no job queue for beta)
  app.post(
    '/recipes/import',
    { preHandler: [requireAuth] },
    async (_request, reply) => {
      return reply.status(501).send({
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Recipe import coming soon',
        },
      });
    }
  );
}
