export type Shift = 'am' | 'pm' | 'mn'

export function currentShift(): Shift {
  const h = new Date().getHours()
  if (h >= 7 && h < 15) return 'am'
  if (h >= 15 && h < 23) return 'pm'
  return 'mn'
}

export const SHIFT_LABELS: Record<Shift, string> = {
  am: 'AM (07:00–14:59)',
  pm: 'PM (15:00–22:59)',
  mn: 'MN (23:00–06:59)',
}

export interface IposLog {
  id: string
  resident_id: string
  home_id: string
  log_date: string
  status: 'draft' | 'submitted' | 'approved' | 'needs_revision'
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  resident_first?: string
  resident_last?: string
}

export interface IposEntry {
  id: string
  log_id: string
  user_id: string
  shift: Shift
  goal_id: string | null
  task_id_code: string | null
  cls_minutes: number
  pc_minutes: number
  progress_code: string | null
  narrative: string | null
  created_at: string
  updated_at: string
  // Joined fields
  staff_first?: string
  staff_last?: string
  goal_code?: string
  goal_description?: string
}

export interface IposReviewComment {
  id: string
  log_id: string
  entry_id: string | null
  user_id: string
  content: string
  created_at: string
  // Joined fields
  commenter_first?: string
  commenter_last?: string
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

export interface VitalsLog {
  id: string
  resident_id: string
  home_id: string
  user_id: string
  vital_type: string
  value_primary: number
  value_secondary: number | null
  unit: string | null
  meal_timing: string | null
  notes: string | null
  is_flagged: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
}

export interface DayProgramLog {
  id: string
  resident_id: string
  home_id: string
  logged_by: string
  program_name: string
  program_address: string | null
  transport_staff: string | null
  transport_method: string | null
  departed_at: string
  returned_at: string | null
  return_notes: string | null
  created_at: string
}

export interface ShiftSelection {
  id: string
  user_id: string
  home_id: string
  selection_date: string
  shifts: string[]
  selected_at: string
}
