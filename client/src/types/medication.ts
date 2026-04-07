export interface Medication {
  id: string
  resident_id: string
  name: string
  dosage: string
  frequency: string
  scheduled_time: string | null
  instructions: string | null
  prescriber: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  // Joined fields returned by GET /homes/:id/medications
  first_name?: string
  last_name?: string
}

export type MedicationOutcome = 'given' | 'partial' | 'refused' | 'missed' | 'held'

export interface MedicationLog {
  id: string
  medication_id: string
  resident_id: string
  administered_by: string
  outcome: MedicationOutcome
  notes: string | null
  administered_at: string
  scheduled_date: string | null
  // Joined fields returned by MAR endpoints
  admin_first?: string
  admin_last?: string
}

// Shape returned by GET /residents/:id/medication-logs and GET /homes/:id/mar
export interface MarEntry {
  medication_id: string
  med_name: string
  med_dosage: string
  med_frequency: string
  scheduled_time: string | null
  instructions: string | null
  log_id: string | null
  outcome: MedicationOutcome | null
  log_notes: string | null
  administered_at: string | null
  scheduled_date: string | null
  admin_first: string | null
  admin_last: string | null
}

export interface HomeMarEntry extends MarEntry {
  resident_id: string
  resident_first: string
  resident_last: string
  room: string | null
}

export interface BulkAdministerResult {
  id: string
  medication_id: string
  status: 'ok' | 'error'
  error?: string
}
