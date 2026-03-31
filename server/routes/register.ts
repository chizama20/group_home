import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { sendOrgRequestConfirmationEmail } from '../services/email';
import { validate, registerOrgSchema } from '../schemas';

interface RegisterBody {
  org_name:           string;
  facility_type:      string;
  contact_name:       string;
  contact_email:      string;
  contact_phone?:     string;
  num_homes?:         number;
  state:              string;
  current_operations?: string;
  additional_notes?:  string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.post<{ Body: RegisterBody }>('/', async (request, reply) => {
    const parsed = validate(registerOrgSchema, request.body);
    if (!parsed.success) return reply.code(400).send(failure('VALIDATION_ERROR', parsed.message));

    const {
      org_name, facility_type, contact_name, contact_email,
      contact_phone, num_homes, state,
      current_operations, additional_notes,
    } = parsed.data;

    const id = uuidv4();
    await fastify.db.execute(
      `INSERT INTO org_requests
        (id, org_name, contact_name, contact_email, contact_phone, num_homes, state, facility_type, current_operations, additional_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, org_name, contact_name, contact_email, contact_phone ?? null, num_homes ?? null, state.toUpperCase(), facility_type, current_operations ?? null, additional_notes ?? null]
    );

    await sendOrgRequestConfirmationEmail(contact_email, org_name).catch(() => {
      // Non-fatal — request is saved regardless of email failure
    });

    return reply.code(201).send(success({ message: 'Request received. We\'ll be in touch shortly.' }));
  });
};
