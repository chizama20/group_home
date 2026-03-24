import { FastifyRequest, FastifyReply } from 'fastify';
import { fastifyMysql } from '@fastify/mysql';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; email: string; role: 'admin' | 'staff' };
    user:    { id: number; email: string; role: 'admin' | 'staff' };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    mysql: import('@fastify/mysql').MySQLPool;
  }
}
