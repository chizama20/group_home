import { FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'mysql2/promise';
import { Role } from './index';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; role: Role; org_id: string };
    user:    { id: string; role: Role; org_id: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    db: Pool;
  }
}
