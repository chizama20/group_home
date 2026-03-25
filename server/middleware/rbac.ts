import { FastifyRequest, FastifyReply } from 'fastify';
import { failure } from '../utils/response';

export const orgAdminOnly = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (request.user.role !== 'org_admin') {
    reply.code(403).send(failure('FORBIDDEN', 'Org admin access required'));
  }
};

export const managerOrAbove = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!['org_admin', 'manager'].includes(request.user.role)) {
    reply.code(403).send(failure('FORBIDDEN', 'Manager or above access required'));
  }
};
