import { useState, useEffect } from 'react'
import { getResidentMedications } from '../../../api/medications'
import type { Medication } from '../../../types/medication'

function groupByTime(meds: Medication[]): Map<string, Medication[]> {
  const map = new Map<string, Medication[]>()
  for (const m of meds) {
    const key = m.scheduled_time ?? 'Unscheduled'
    const group = map.get(key) ?? []
    group.push(m)
    map.set(key, group)
  }
  return map
}

export default function MedicationsTab({ residentId }: { residentId: string }) {
  const [meds, setMeds]       = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    getResidentMedications(residentId)
      .then(res => setMeds(res.data.data?.filter(m => m.is_active) ?? []))
      .catch(() => setError('Failed to load medications'))
      .finally(() => setLoading(false))
  }, [residentId])

  if (loading) return <p className='p-4 text-sm text-gray-500'>Loading…</p>
  if (error)   return <p className='p-4 text-sm text-red-600'>{error}</p>
  if (!meds.length) return <p className='p-4 text-sm text-gray-500'>No active medications</p>

  const groups = groupByTime(meds)
  const sorted = [...groups.entries()].sort(([a], [b]) =>
    a === 'Unscheduled' ? 1 : b === 'Unscheduled' ? -1 : a.localeCompare(b)
  )

  return (
    <div className='space-y-3 p-4'>
      {sorted.map(([time, items]) => (
        <div key={time} className='bg-white rounded-xl shadow-sm overflow-hidden'>
          <div className='px-4 py-2 bg-gray-50 border-b border-gray-100'>
            <span className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>{time}</span>
          </div>
          {items.map(med => (
            <div key={med.id} className='px-4 py-3 border-b border-gray-50 last:border-0'>
              <p className='text-sm font-semibold text-gray-900'>{med.name}</p>
              <p className='text-xs text-gray-500 mt-0.5'>{med.dosage} · {med.frequency}</p>
              {med.instructions && (
                <p className='text-xs text-gray-400 mt-1 italic'>{med.instructions}</p>
              )}
              {med.prescriber && (
                <p className='text-xs text-gray-400 mt-0.5'>Prescribed by {med.prescriber}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
