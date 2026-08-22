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
