import { useState, useEffect } from 'react'
import { getHomeIncidents } from '../../../api/incidents'
import type { Incident } from '../../../types/incident'
import StatusBadge from '../../../components/StatusBadge'
import { formatDate } from '../../../utils/date'

interface Props {
  residentId: string
  homeId:     string
}

export default function IncidentsTab({ residentId, homeId }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    getHomeIncidents(homeId)
      .then(res => {
        const all = res.data.data ?? []
        setIncidents(all.filter(i => i.resident_id === residentId))
      })
      .catch(() => setError('Failed to load incidents'))
      .finally(() => setLoading(false))
  }, [homeId, residentId])

  if (loading) return <p className='p-4 text-sm text-gray-500'>Loading…</p>
  if (error)   return <p className='p-4 text-sm text-red-600'>{error}</p>
  if (!incidents.length) return <p className='p-4 text-sm text-gray-500'>No incidents on record</p>

  return (
    <div className='p-4 space-y-3'>
      {incidents.map(incident => (
        <div key={incident.id} className='bg-white rounded-xl shadow-sm px-4 py-3'>
          <div className='flex items-start justify-between gap-2 mb-1'>
            <p className='text-sm font-semibold text-gray-900'>{incident.title}</p>
            <StatusBadge status={incident.status} />
          </div>
          <p className='text-xs text-gray-500 mb-2'>{formatDate(incident.created_at)}</p>
          {incident.description && (
            <p className='text-sm text-gray-700 leading-relaxed'>{incident.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
