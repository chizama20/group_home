import { FastifyReply } from 'fastify';

export function errorResponse(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string
) {
  return reply.status(statusCode).send({
    success: false,
    error: { code, message }
  });
}
