import { useAuth } from '../context/AuthContext'

export function useRole() {
  const { user } = useAuth()
  const role = user?.role ?? 'employee'
  return {
    isEmployee:       role === 'employee',
    isManager:        role === 'manager',
    isOrgAdmin:       role === 'org_admin',
    isManagerOrAbove: role === 'manager' || role === 'org_admin',
  }
}
