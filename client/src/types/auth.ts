export type UserRole = 'employee' | 'manager' | 'org_admin'

export interface AuthUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  org_id: string
}
