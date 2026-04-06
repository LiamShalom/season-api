import { FastifyInstance } from 'fastify';
import { AppError } from '../../shared/errors.js';
import { signupService, loginService, refreshService, logoutService } from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/signup', async (request, reply) => {
    const body = request.body as {
      username?: string;
      display_name?: string;
      email?: string;
      password?: string;
    };

    if (!body.username || !body.display_name || !body.email || !body.password) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'username, display_name, email, and password are required' },
      });
    }

    if (body.password.length < 8) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' },
      });
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(body.username)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Username must be 3-30 alphanumeric characters or underscores' },
      });
    }

    try {
      const result = await signupService(app, {
        username: body.username,
        display_name: body.display_name,
        email: body.email,
        password: body.password,
      });
      return reply.status(201).send({ data: result });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const body = request.body as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'email and password are required' },
      });
    }

    try {
      const result = await loginService(app, { email: body.email, password: body.password });
      return reply.status(200).send({ data: result });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = request.body as { refresh_token?: string };

    if (!body.refresh_token) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'refresh_token is required' },
      });
    }

    try {
      const result = await refreshService(app, { refresh_token: body.refresh_token });
      return reply.status(200).send({ data: result });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  app.post('/auth/logout', async (request, reply) => {
    const body = request.body as { refresh_token?: string };

    if (!body.refresh_token) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'refresh_token is required' },
      });
    }

    await logoutService({ refresh_token: body.refresh_token });
    return reply.status(200).send({ data: { message: 'Logged out successfully' } });
  });
}
