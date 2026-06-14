export type ShiftType = 'day' | 'evening' | 'night'
export type SlotStatus = 'scheduled' | 'cancelled'
export type RequestStatus = 'pending' | 'approved' | 'denied'

export interface ShiftSlot {
  id: string
  home_id: string
  home_name?: string        // joined for my-slots view
  user_id: string
  first_name: string
  last_name: string
  role: string
  date: string              // YYYY-MM-DD
  shift_type: ShiftType
  status: SlotStatus
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface WeekSchedule {
  // keyed by date string (YYYY-MM-DD), each date has slots grouped by shift_type
  [date: string]: {
    day: ShiftSlot[]
    evening: ShiftSlot[]
    night: ShiftSlot[]
  }
}

export interface ShiftRequest {
  id: string
  home_id: string
  requester_id: string
  requester_first_name: string
  requester_last_name: string
  slot_id?: string
  type: 'time_off'
  date: string
  shift_type: ShiftType
  reason?: string
  replacement_user_id?: string
  status: RequestStatus
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

export interface CreateSlotPayload {
  user_id: string
  date: string
  shift_type: ShiftType
  notes?: string
}

export interface UpdateSlotPayload {
  user_id?: string
  shift_type?: ShiftType
  date?: string
  status?: SlotStatus
  notes?: string
}

export interface CreateRequestPayload {
  slot_id: string
  date: string
  shift_type: ShiftType
  reason?: string
}

export interface ReviewRequestPayload {
  status: 'approved' | 'denied'
  replacement_user_id?: string
}

export type ScheduleRequest = ShiftRequest
