import { useState, useEffect } from 'react'
import { getHomes, type Home } from '../api/homes'

export function useSelectedHome() {
  const [homes, setHomes]         = useState<Home[]>([])
  const [homeId, setHomeId]       = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    getHomes()
      .then(res => {
        if (res.data.success && res.data.data) {
          const list = res.data.data
          setHomes(list)
          const stored = localStorage.getItem('homeId')
          const found  = list.find(h => h.id === stored)
          setHomeId(found ? found.id : (list[0]?.id ?? null))
        }
      })
      .catch(() => setError('Failed to load homes'))
      .finally(() => setIsLoading(false))
  }, [])

  function selectHome(id: string) {
    setHomeId(id)
    localStorage.setItem('homeId', id)
  }

  const selectedHome = homes.find(h => h.id === homeId) ?? null

  return { homes, homeId, selectedHome, selectHome, isLoading, error }
}
