import { useState, useEffect } from 'react'
import { getResidentIncidents } from '../../../api/incidents'
import type { Incident } from '../../../types/incident'
import StatusBadge from '../../../components/StatusBadge'
import { formatDate } from '../../../utils/date'

interface Props {
  residentId: string
  homeId:     string
}

export default function IncidentsTab({ residentId }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    getResidentIncidents(residentId)
      .then(res => setIncidents(res.data.data ?? []))
      .catch(() => setError('Failed to load incidents'))
      .finally(() => setLoading(false))
  }, [residentId])

  if (loading) return (
    <div className='flex items-center justify-center min-h-[200px]'>
      <div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' />
    </div>
  )
  if (error)   return <p className='p-4 text-sm text-zinc-500 dark:text-zinc-400'>{error}</p>
  if (!incidents.length) return <p className='p-4 text-center text-sm text-zinc-400 dark:text-zinc-600'>No incidents on record</p>

  return (
    <div className='p-4 space-y-3'>
      {incidents.map(incident => (
        <div key={incident.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3'>
          <div className='flex items-start justify-between gap-2 mb-1'>
            <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{incident.title}</p>
            <StatusBadge status={incident.status} />
          </div>
          <p className='text-xs text-zinc-400 dark:text-zinc-500 mb-2'>{formatDate(incident.created_at)}</p>
          {incident.description && (
            <p className='text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed'>{incident.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
