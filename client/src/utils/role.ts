import { useAuth } from '../context/AuthContext'

export function useRole() {
  const { user } = useAuth()
  const role = user?.role ?? 'staff'
  return {
    isAdmin: role === 'admin',
    isStaff: role === 'staff',
  }
}
