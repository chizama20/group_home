// Re-export all types from individual modules
export type { ApiResponse } from './api'
export type { UserRole, AuthUser } from './auth'
export type { Resident, TrackedBehavior } from './resident'
export type { Medication, MedicationLog, MedicationOutcome } from './medication'
export type { Incident, IncidentStatus } from './incident'
export type { Shift, IposLog, BehavioralLog, ShiftNote, Announcement } from './log'
export type { Task } from './task'
export type { Appointment, AppointmentFormData } from './appointment'

// Legacy types kept for backwards compatibility
export type Role = 'employee' | 'manager' | 'org_admin'

export interface Org {
  id: string
  name: string
  created_at: string
}

export interface Home {
  id: string
  org_id: string
  name: string
  address?: string
  is_active: boolean
  created_at: string
}

export interface User {
  id: string
  org_id: string
  email: string
  first_name: string
  last_name: string
  role: Role
  is_active: boolean
}
