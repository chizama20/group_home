import { useState, useEffect } from 'react'
import { getResidents } from '../api/residents'
import type { Resident } from '../types/resident'

export function useResidents(homeId: string | null) {
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!homeId) return
    setLoading(true)
    setError(null)
    getResidents(homeId)
      .then(res => {
        setResidents(res.data.data ?? [])
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load residents')
      })
      .finally(() => setLoading(false))
  }, [homeId])

  return { residents, loading, error }
}
