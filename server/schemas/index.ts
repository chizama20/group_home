import { z } from 'zod'

// ── Shared primitives ──────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid()

export const paginationSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
})

// ── Auth ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const signupSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().min(1).max(100),
  last_name:  z.string().min(1).max(100),
  home_name:  z.string().min(1).max(200).optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// ── Home ───────────────────────────────────────────────────────────────────

export const createHomeSchema = z.object({
  name:    z.string().min(1).max(200),
  address: z.string().max(500).optional(),
})

// ── Resident ───────────────────────────────────────────────────────────────

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const createResidentSchema = z.object({
  first_name:               z.string().min(1).max(100),
  last_name:                z.string().min(1).max(100),
  date_of_birth:            z.string().regex(dateRegex, 'date_of_birth must be YYYY-MM-DD'),
  room:                     z.string().max(50).optional(),
  diagnosis:                z.string().max(1000).optional(),
  physician:                z.string().max(200).optional(),
  primary_contact_name:     z.string().max(200).optional(),
  primary_contact_phone:    z.string().max(30).optional(),
  primary_contact_relation: z.string().max(100).optional(),
  notes:                    z.string().max(5000).optional(),
})

export const patchResidentSchema = createResidentSchema.partial()

// ── Medication ─────────────────────────────────────────────────────────────

export const createMedicationSchema = z.object({
  name:           z.string().min(1).max(200),
  dosage:         z.string().min(1).max(100),
  frequency:      z.string().min(1).max(200),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use HH:MM format').optional(),
  instructions:   z.string().max(2000).optional(),
  prescriber:     z.string().max(200).optional(),
})

export const administerMedSchema = z.object({
  outcome: z.enum(['given', 'partial', 'refused', 'missed', 'held']),
  notes:   z.string().max(2000).optional(),
})

// ── Shift note ─────────────────────────────────────────────────────────────

const SHIFTS = ['day', 'evening', 'night'] as const

export const createShiftNoteSchema = z.object({
  home_id:     z.string().min(1),
  resident_id: z.string().uuid().optional(),
  shift:       z.enum(SHIFTS),
  shift_date:  z.string().regex(dateRegex, 'shift_date must be YYYY-MM-DD'),
  content:     z.string().min(1).max(10000),
  flagged:     z.boolean().optional(),
})

// ── Incident ───────────────────────────────────────────────────────────────

export const createIncidentSchema = z.object({
  resident_id:   z.string().uuid(),
  incident_type: z.string().min(1).max(200),
  severity:      z.enum(['low', 'medium', 'high']),
  description:   z.string().min(1).max(10000),
  occurred_at:   z.string().min(1),
})

// ── IPOS log ───────────────────────────────────────────────────────────────

export const createIposSchema = z.object({
  resident_id: z.string().uuid(),
  home_id:     z.string().min(1),
  shift:       z.enum(SHIFTS),
  log_date:    z.string().regex(dateRegex),
  content:     z.string().min(1).max(10000),
})

// ── Announcement ───────────────────────────────────────────────────────────

export const createAnnouncementSchema = z.object({
  title:       z.string().min(1).max(300),
  body:        z.string().min(1).max(10000),
  is_pinned:   z.boolean().optional(),
  send_to_all: z.boolean().optional(),
})

// ── Task ───────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title:       z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  due_date:    z.string().regex(dateRegex).optional(),
})

// ── Appointment ────────────────────────────────────────────────────────────

export const createAppointmentSchema = z.object({
  resident_id:       z.string().uuid(),
  type:              z.string().min(1).max(100),
  title:             z.string().min(1).max(300),
  appointment_date:  z.string().regex(dateRegex),
  appointment_time:  z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location:          z.string().max(300).optional(),
  notes:             z.string().max(2000).optional(),
  collector_name:    z.string().max(200).optional(),
  collector_phone:   z.string().max(30).optional(),
})

// ── Users ──────────────────────────────────────────────────────────────────

export const setSigningPinSchema = z.object({
  current_password: z.string().min(1),
  pin:              z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
})

export const verifySigningPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
})

// ── Invite ─────────────────────────────────────────────────────────────────

export const createInviteSchema = z.object({
  email:   z.string().email(),
  role:    z.enum(['employee', 'manager']),
  home_id: z.string().uuid().optional(),
})

export const acceptInviteSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name:  z.string().min(1).max(100),
  password:   z.string().min(8),
})

// ── Registration ───────────────────────────────────────────────────────────

const FACILITY_TYPES = [
  'group_home', 'assisted_living', 'foster_care',
  'supported_living', 'day_program', 'other',
] as const

export const registerOrgSchema = z.object({
  org_name:           z.string().min(1).max(300),
  facility_type:      z.enum(FACILITY_TYPES),
  contact_name:       z.string().min(1).max(200),
  contact_email:      z.string().email(),
  contact_phone:      z.string().max(30).optional(),
  num_homes:          z.coerce.number().int().min(1).optional(),
  state:              z.string().min(2).max(2),
  current_operations: z.string().max(5000).optional(),
  additional_notes:   z.string().max(5000).optional(),
})

// ── Helper ─────────────────────────────────────────────────────────────────

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; message: string } {
  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data }
  const message = result.error.issues.map(e => `${String(e.path.join('.'))}: ${e.message}`).join('; ')
  return { success: false, message }
}
