import { Navigate } from 'react-router-dom'
import { useRole } from '../utils/role'

interface Props { children: React.ReactNode }

export default function RequireAdmin({ children }: Props) {
  const { isAdmin } = useRole()
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
