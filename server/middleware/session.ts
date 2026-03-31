import { FastifyInstance } from 'fastify';

/**
 * Registers a preHandler hook that updates last_active_at on every
 * authenticated request. Attach after fastify.authenticate in routes
 * that need activity tracking, or register globally here.
 */
export default async function sessionMiddleware(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', async (request) => {
    // Only update if the user was successfully authenticated (request.user is set)
    if (!request.user?.id) return;

    try {
      await fastify.db.execute(
        'UPDATE users SET last_active_at = NOW() WHERE id = ?',
        [request.user.id]
      );
    } catch {
      // Non-fatal — don't block the request if this update fails
    }
  });
}
