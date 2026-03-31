import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { failure } from '../utils/response';

export default async function adminAuthMiddleware(fastify: FastifyInstance): Promise<void> {
  fastify.decorate(
    'adminAuthenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token       = request.cookies?.admin_token;
      const adminSecret = process.env.ADMIN_JWT_SECRET;

      if (!token || !adminSecret) {
        return reply.code(401).send(failure('UNAUTHORIZED', 'Admin authentication required'));
      }

      try {
        const payload = jwt.verify(token, adminSecret) as { sub?: string };
        if (payload.sub !== 'admin') {
          return reply.code(401).send(failure('UNAUTHORIZED', 'Invalid admin token'));
        }
      } catch {
        return reply.code(401).send(failure('UNAUTHORIZED', 'Admin authentication required'));
      }
    }
  );
}
