export interface Appointment {
  id: string
  resident_id: string
  home_id: string
  scheduled_by: string
  type: string
  title: string
  appointment_date: string
  appointment_time: string | null
  location: string | null
  notes: string | null
  collector_name: string | null
  collector_phone: string | null
  completed_by: string | null
  completed_at: string | null
  created_at: string
}

export interface AppointmentFormData {
  resident_id: string
  type: string
  title: string
  appointment_date: string
  appointment_time?: string
  location?: string
  notes?: string
  collector_name?: string
  collector_phone?: string
  expected_return_time?: string
}
