import { Navigate } from 'react-router-dom'
import { useRole } from '../utils/role'

interface Props { children: React.ReactNode }

export default function OrgAdminRoute({ children }: Props) {
  const { isOrgAdmin } = useRole()
  if (!isOrgAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
