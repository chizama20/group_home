export type ShiftType = 'day' | 'evening' | 'night'

export interface ShiftSlot {
  id: string
  home_id: string
  user_id: string
  date: string
  shift_type: ShiftType
  // Joined fields
  first_name?: string
  last_name?: string
}

export interface WeekSchedule {
  week: string
  schedule: Record<string, {
    day: ShiftSlot[]
    evening: ShiftSlot[]
    night: ShiftSlot[]
  }>
}

export type RequestStatus = 'pending' | 'approved' | 'denied'

export interface ScheduleRequest {
  id: string
  home_id: string
  user_id: string
  date: string
  shift_type: ShiftType
  reason: string | null
  status: RequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  // Joined fields
  first_name?: string
  last_name?: string
}
