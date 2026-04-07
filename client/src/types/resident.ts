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
  gender?: string
  medicaid_id?: string
  admit_date?: string
  hab_waiver?: boolean
  loa_info?: string
  sleep_hours?: number
  attends_day_program?: boolean
  day_program_days_per_week?: number
  discharge_date?: string
  discharged_by?: string
}

export interface TrackedBehavior {
  id: string
  resident_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface ResidentContact {
  id: string
  resident_id: string
  name: string
  relationship?: string
  phone?: string
  email?: string
  is_emergency_contact: boolean
  notify_on_incident: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ResidentGoal {
  id: string
  resident_id: string
  goal_type: 'cls' | 'pc'
  code: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ResidentVitalsConfig {
  id: string
  resident_id: string
  vital_type: 'blood_glucose' | 'blood_pressure' | 'weight' | 'temperature' | 'o2_sat' | 'other'
  label?: string
  frequency?: string
  meal_timing?: string
  target_min?: number
  target_max?: number
  unit?: string
  is_active: boolean
  created_at: string
  updated_at: string
}
