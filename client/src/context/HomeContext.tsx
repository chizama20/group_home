import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getHomes, type Home } from '../api/homes'

interface HomeContextValue {
  homes: Home[]
  homeId: string | null
  selectedHome: Home | null
  selectHome: (id: string) => void
  isLoading: boolean
  error: string | null
}

const HomeContext = createContext<HomeContextValue | null>(null)

export function HomeProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const [homes, setHomes]         = useState<Home[]>([])
  const [homeId, setHomeId]       = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setHomes([])
      setHomeId(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    getHomes()
      .then(res => {
        if (res.data.success && res.data.data) {
          const list = res.data.data
          setHomes(list)
          const stored = localStorage.getItem('homeId')
          const found  = list.find(h => h.id === stored)
          if (found) {
            setHomeId(found.id)
          } else if (list.length === 1) {
            // Single home — auto-select silently
            setHomeId(list[0].id)
            localStorage.setItem('homeId', list[0].id)
          } else {
            // Multiple homes, no stored selection — let UI handle (selection screen)
            setHomeId(null)
          }
        }
      })
      .catch(() => setError('Failed to load homes'))
      .finally(() => setIsLoading(false))
  }, [authLoading, user])

  function selectHome(id: string) {
    setHomeId(id)
    localStorage.setItem('homeId', id)
  }

  const selectedHome = homes.find(h => h.id === homeId) ?? null

  return (
    <HomeContext.Provider value={{ homes, homeId, selectedHome, selectHome, isLoading, error }}>
      {children}
    </HomeContext.Provider>
  )
}

export function useHome() {
  const ctx = useContext(HomeContext)
  if (!ctx) throw new Error('useHome must be used within HomeProvider')
  return ctx
}
