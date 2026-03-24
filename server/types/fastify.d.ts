import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from './index';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; email: string; role: Role; organizationId: number };
    user:    { id: number; email: string; role: Role; organizationId: number };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    mysql: import('@fastify/mysql').MySQLPromisePool;
  }
}
