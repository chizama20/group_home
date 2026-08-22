export type UserRole = 'staff' | 'admin'

export interface AuthUser {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string | null
  role: UserRole
  org_id: string
  pin_set_at: string | null
  notification_prefs?: {
    announcements: boolean
    schedule_changes: boolean
    trade_claimed: boolean
  } | null
}
