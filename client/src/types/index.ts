// Re-export all types from individual modules
export type { ApiResponse } from './api'
export type { UserRole, AuthUser } from './auth'
export type { Resident, TrackedBehavior } from './resident'
export type { Medication } from './medication'
export type { Shift, IposLog, BehavioralLog, ShiftNote, Announcement } from './log'
export type { Appointment, AppointmentFormData } from './appointment'

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
