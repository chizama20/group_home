export type Shift = 'day' | 'evening' | 'night'

export function currentShift(): Shift {
  const h = new Date().getHours()
  if (h >= 7 && h < 15) return 'day'
  if (h >= 15 && h < 23) return 'evening'
  return 'night'
}

export const SHIFT_LABELS: Record<Shift, string> = {
  day:     'Day (07:00–14:59)',
  evening: 'Evening (15:00–22:59)',
  night:   'Night (23:00–06:59)',
}

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
  // Joined fields returned by GET endpoints
  behavior_name?: string
  resident_first?: string
  resident_last?: string
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
  // Joined fields returned by GET endpoint
  first_name?: string
  last_name?: string
  resident_first?: string
  resident_last?: string
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
  // Joined fields returned by GET endpoint
  poster_first?: string
  poster_last?: string
}
