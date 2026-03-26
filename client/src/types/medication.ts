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
}

export type MedicationOutcome = 'given' | 'refused' | 'missed' | 'held'

export interface MedicationLog {
  id: string
  medication_id: string
  resident_id: string
  administered_by: string
  outcome: MedicationOutcome
  notes: string | null
  administered_at: string
}
