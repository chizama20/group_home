import { FastifyInstance } from 'fastify';
import { comparePassword } from '../utils/password';
import { success, failure } from '../utils/response';

interface LoginBody {
  email: string;
  password: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.post<{ Body: LoginBody }>(
    '/login',
    async (request, reply) => {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply.code(400).send(failure('MISSING_FIELDS', 'Email and password are required'));
      }

      fastify.mysql.query(
        'SELECT * FROM users WHERE email = ?',
        [email],
        async (err: Error | null, results: any[]) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));

          const user = results[0];
          if (!user) {
            return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));
          }

          const valid = await comparePassword(password, user.password_hash);
          if (!valid) {
            return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));
          }

          const token = fastify.jwt.sign({
            id:    user.id,
            email: user.email,
            role:  user.role
          });

          reply.send(success({
            token,
            user: { id: user.id, name: user.name, role: user.role }
          }));
        }
      );
    }
  );

  fastify.post(
    '/logout',
    async (_request, reply) => {
      reply.send(success({ message: 'Logged out successfully' }));
    }
  );
};
