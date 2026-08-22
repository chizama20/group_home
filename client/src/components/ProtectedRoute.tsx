import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location            = useLocation()

  if (isLoading) return <div className='flex items-center justify-center h-screen text-zinc-500'>Loading…</div>
  if (!user) return <Navigate to='/login' replace />

  // Force PIN setup before accessing any protected page
  if (!user.pin_set_at && location.pathname !== '/setup-pin') {
    return <Navigate to='/setup-pin' replace />
  }

  return <>{children}</>
}
