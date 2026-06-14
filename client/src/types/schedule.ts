export type ShiftType = 'day' | 'evening' | 'night'

export interface ShiftSlot {
  id: string
  home_id: string
  home_name: string
  date: string        // ISO date string e.g. "2026-06-16"
  shift_type: ShiftType
  start_time?: string
  end_time?: string
}

export interface ScheduleRequest {
  id: string
  slot_id: string
  home_id: string
  date: string
  shift_type: ShiftType
  reason?: string
  status: 'pending' | 'approved' | 'denied'
  created_at: string
}

export interface CreateRequestPayload {
  slot_id: string
  date: string
  shift_type: ShiftType
  reason?: string
}
