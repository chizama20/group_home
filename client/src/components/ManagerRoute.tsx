import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export default function ManagerRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className='flex items-center justify-center h-screen text-gray-500'>Loading…</div>
  if (!user || (user.role !== 'manager' && user.role !== 'org_admin')) return <Navigate to='/' replace />
  return <>{children}</>
}
