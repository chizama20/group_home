import 'dotenv/config';
import Fastify from 'fastify';

const server = Fastify({ logger: true });
const PORT = Number(process.env.PORT) || 3000;

server.get('/health', async () => {
  return { success: true, message: 'Server is running' };
});

const start = async (): Promise<void> => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();