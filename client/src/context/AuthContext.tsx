import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AuthUser } from '../types/auth'
import { login as apiLogin, logout as apiLogout } from '../api/auth'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  org: { id: string; name: string } | null
  login: (orgId: string, email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [token, setToken]     = useState<string | null>(null)
  const [org, setOrg]         = useState<{ id: string; name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser  = localStorage.getItem('user')
    const storedOrg   = localStorage.getItem('org')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser) as AuthUser)
      if (storedOrg) setOrg(JSON.parse(storedOrg) as { id: string; name: string })
    }
    setIsLoading(false)
  }, [])

  async function login(orgId: string, email: string, password: string) {
    const res  = await apiLogin(orgId, email, password)
    const data = res.data
    if (!data.success || !data.data) throw new Error(data.error?.message ?? 'Login failed')

    const { token: newToken, user: newUser, org: newOrg } = data.data
    localStorage.setItem('token', newToken)
    localStorage.setItem('user',  JSON.stringify(newUser))
    localStorage.setItem('org',   JSON.stringify(newOrg))
    setToken(newToken)
    setUser(newUser)
    setOrg(newOrg)
  }

  function logout() {
    void apiLogout().catch(() => {/* ignore — client-side discard is sufficient */})
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('org')
    setToken(null)
    setUser(null)
    setOrg(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, org, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
