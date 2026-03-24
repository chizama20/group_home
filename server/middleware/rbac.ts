import { FastifyRequest, FastifyReply } from 'fastify';
import { failure } from '../utils/response';

export const ownerOnly = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (request.user.role !== 'owner') {
    reply.code(403).send(failure('FORBIDDEN', 'Owner access required'));
  }
};

export const managerOrAbove = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!['owner', 'manager'].includes(request.user.role)) {
    reply.code(403).send(failure('FORBIDDEN', 'Manager or owner access required'));
  }
};
