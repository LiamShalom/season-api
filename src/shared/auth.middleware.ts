import { FastifyRequest, FastifyReply } from 'fastify';

export interface JWTPayload {
  id: string;
  username: string;
}

// Extend @fastify/jwt type so request.user is typed as JWTPayload
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; username: string; type?: string };
    user: JWTPayload;
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
    const user = request.user;
    if (!user?.id || !user?.username) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      });
    }
  } catch (err: unknown) {
    if (err instanceof Error && (err.message?.includes('expired') || err.message?.includes('TokenExpired'))) {
      return reply.status(401).send({
        error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
      });
    }
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    });
  }
}

export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    // Not authenticated — fine for optional routes
  }
}
