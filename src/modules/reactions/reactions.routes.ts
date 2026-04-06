import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/auth.middleware.js';
import { AppError, Errors } from '../../shared/errors.js';
import { upsertReaction, deleteReaction, ReactionType } from './reactions.repository.js';
import { findPostById } from '../posts/posts.repository.js';

const VALID_REACTION_TYPES: ReactionType[] = ['love_it', 'want_to_try', 'made_it'];

export async function reactionsRoutes(app: FastifyInstance) {
  // POST /posts/:postId/reactions
  app.post(
    '/posts/:postId/reactions',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { postId } = request.params as { postId: string };
      const body = request.body as { type?: string };

      if (!body.type || !VALID_REACTION_TYPES.includes(body.type as ReactionType)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'type must be one of: love_it, want_to_try, made_it',
          },
        });
      }

      try {
        const post = await findPostById(postId);
        if (!post) throw Errors.NOT_FOUND('Post');
        if (post.visibility !== 'public' && post.author_id !== request.user!.id) {
          throw Errors.NOT_FOUND('Post');
        }

        const reaction = await upsertReaction({
          user_id: request.user!.id,
          post_id: postId,
          type: body.type as ReactionType,
        });

        return reply.status(200).send({
          data: {
            id: reaction.id,
            user_id: reaction.user_id,
            post_id: reaction.post_id,
            type: reaction.type,
            created_at: reaction.created_at,
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

  // DELETE /posts/:postId/reactions
  app.delete(
    '/posts/:postId/reactions',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { postId } = request.params as { postId: string };

      try {
        await deleteReaction(request.user!.id, postId);
        return reply.status(200).send({ data: { reacted: false } });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );
}
