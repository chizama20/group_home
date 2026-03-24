import fp from 'fastify-plugin';
import mysql from '@fastify/mysql';
import { FastifyInstance } from 'fastify';

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(mysql, {
    connectionString: `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    promise: true
  });
});
