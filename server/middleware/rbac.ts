import { FastifyRequest, FastifyReply } from 'fastify';
import { failure } from '../utils/response';

export const adminOnly = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (request.user.role !== 'admin') {
    return reply.code(403).send(failure('FORBIDDEN', 'Admin access required'));
  }
};
