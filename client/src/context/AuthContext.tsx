import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AuthUser } from '../types/auth'
import { login as apiLogin, logout as apiLogout, getMe } from '../api/auth'

interface AuthContextValue {
  user: AuthUser | null
  org:  { id: string; name: string } | null
  login:   (email: string, password: string) => Promise<void>
  logout:  () => Promise<void>
  setUser: (user: AuthUser) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<AuthUser | null>(null)
  const [org, setOrg]       = useState<{ id: string; name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from cookie via GET /auth/me on mount
  useEffect(() => {
    getMe()
      .then(res => {
        const data = res.data
        if (data.success && data.data) {
          const { org: userOrg, ...userData } = data.data
          setUser(userData)
          setOrg(userOrg)
        }
      })
      .catch(() => {
        // No valid session — user stays null, will be redirected by ProtectedRoute
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res  = await apiLogin(email, password)
    const data = res.data
    if (!data.success || !data.data) throw new Error(data.error?.message ?? 'Login failed')

    const { user: newUser, org: newOrg } = data.data
    setUser(newUser)
    setOrg(newOrg)
  }

  async function logout() {
    try {
      await apiLogout()
    } catch {
      // Server-side cookie clear failed — still clear local state
    }
    setUser(null)
    setOrg(null)
  }

  return (
    <AuthContext.Provider value={{ user, org, login, logout, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
