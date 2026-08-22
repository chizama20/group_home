export type ShiftType = 'day' | 'evening' | 'night'
export type SlotStatus = 'scheduled' | 'cancelled'
export type RequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled'

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
  requester_first: string
  requester_last: string
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

// ── Trade / claim board ─────────────────────────────────────────────────────

export interface ShiftTrade {
  id: string
  slot_id?: string
  date: string
  shift_type: ShiftType
  reason?: string
  status: RequestStatus
  requester_id: string
  requester_first: string
  requester_last: string
  replacement_user_id?: string
  reviewed_at?: string
  created_at: string
}

export interface CreateTradePayload {
  slot_id: string
  reason?: string
}

export interface TradeBoard {
  open: ShiftTrade[]
  mine: ShiftTrade[]
}

// ── Live roster ──────────────────────────────────────────────────────────────

export interface OnNowEntry {
  user_id: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
  shift: ShiftType
  clocked_in_at: string
}

export interface OnLaterEntry {
  slot_id: string
  user_id: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
  shift_type: ShiftType
  date: string
}

export interface LiveRoster {
  onNow: OnNowEntry[]
  onLater: OnLaterEntry[]
}

// ── Recent changes feed ──────────────────────────────────────────────────────

export interface RecentChangeItem {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  description: string | null
  created_at: string
  actor_first: string | null
  actor_last: string | null
  home_id: string | null
  is_new: number
}

export interface RecentChanges {
  items: RecentChangeItem[]
  unseenCount: number
}

// ── Notification preferences ──────────────────────────────────────────────────

export interface NotificationPrefs {
  announcements: boolean
  schedule_changes: boolean
  trade_claimed: boolean
}
