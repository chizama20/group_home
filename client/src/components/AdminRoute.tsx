import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

export default function AdminRoute({ children }: { children: ReactNode }) {
  const authed = sessionStorage.getItem('admin_authed') === '1'
  if (!authed) return <Navigate to='/admin/login' replace />
  return <>{children}</>
}
