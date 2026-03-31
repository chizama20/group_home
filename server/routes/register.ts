import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { sendOrgRequestConfirmationEmail } from '../services/email';

type FacilityType = 'group_home' | 'assisted_living' | 'foster_care' | 'supported_living' | 'day_program' | 'other';

interface RegisterBody {
  org_name:           string;
  facility_type:      FacilityType;
  contact_name:       string;
  contact_email:      string;
  contact_phone:      string;
  num_homes:          number;
  state:              string;
  current_operations?: string;
  additional_notes?:  string;
}

const VALID_FACILITY_TYPES: FacilityType[] = [
  'group_home', 'assisted_living', 'foster_care', 'supported_living', 'day_program', 'other'
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.post<{ Body: RegisterBody }>('/', async (request, reply) => {
    const {
      org_name, facility_type, contact_name, contact_email,
      contact_phone, num_homes, state,
      current_operations, additional_notes,
    } = request.body;

    if (!org_name || !facility_type || !contact_name || !contact_email || !contact_phone || !num_homes || !state)
      return reply.code(400).send(failure('MISSING_FIELDS', 'All required fields must be filled in'));

    if (!VALID_FACILITY_TYPES.includes(facility_type))
      return reply.code(400).send(failure('INVALID_FACILITY_TYPE', 'Invalid facility type'));

    if (!US_STATES.includes(state.toUpperCase()))
      return reply.code(400).send(failure('INVALID_STATE', 'Invalid US state'));

    const id = uuidv4();
    await fastify.db.execute(
      `INSERT INTO org_requests
        (id, org_name, contact_name, contact_email, contact_phone, num_homes, state, facility_type, current_operations, additional_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, org_name, contact_name, contact_email, contact_phone, num_homes, state.toUpperCase(), facility_type, current_operations ?? null, additional_notes ?? null]
    );

    await sendOrgRequestConfirmationEmail(contact_email, org_name).catch(() => {
      // Non-fatal — request is saved regardless of email failure
    });

    return reply.code(201).send(success({ message: 'Request received. We\'ll be in touch shortly.' }));
  });
};
