export type Shift = 'morning' | 'afternoon' | 'overnight'

export interface IposLog {
  id: string
  resident_id: string
  home_id: string
  user_id: string
  shift: Shift
  log_date: string
  content: string
  created_at: string
}

export interface BehavioralLog {
  id: string
  behavior_id: string
  resident_id: string
  user_id: string
  notes: string | null
  occurred_at: string
  created_at: string
}

export interface ShiftNote {
  id: string
  home_id: string
  user_id: string
  resident_id: string | null
  shift: Shift
  shift_date: string
  content: string
  flagged: boolean
  created_at: string
}

export interface Announcement {
  id: string
  org_id: string
  home_id: string | null
  posted_by: string
  title: string
  body: string
  is_pinned: boolean
  created_at: string
}
