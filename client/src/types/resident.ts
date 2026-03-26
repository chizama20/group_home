export interface Resident {
  id: string
  home_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  room: string | null
  diagnosis: string | null
  physician: string | null
  primary_contact_name: string | null
  primary_contact_phone: string | null
  primary_contact_relation: string | null
  notes: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  /** Derived field returned by GET /homes/:id/residents */
  status?: 'urgent' | 'all_good'
}

export interface TrackedBehavior {
  id: string
  resident_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}
