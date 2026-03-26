import { useState, useEffect } from 'react'
import BottomNav from '../../components/BottomNav'
import { useSelectedHome } from '../../hooks/useSelectedHome'
import { getHomeMedications, administerMedication } from '../../api/medications'
import type { Medication, MedicationOutcome } from '../../types/medication'

const OUTCOMES: { value: MedicationOutcome; label: string; classes: string }[] = [
  { value: 'given',   label: 'Give',    classes: 'bg-green-100 text-green-800 hover:bg-green-200' },
  { value: 'refused', label: 'Refused', classes: 'bg-red-100 text-red-800 hover:bg-red-200' },
  { value: 'missed',  label: 'Missed',  classes: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
  { value: 'held',    label: 'Held',    classes: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
]

export default function MedicationsPage() {
  const { homeId, homes, selectHome } = useSelectedHome()
  const [meds, setMeds]               = useState<Medication[]>([])
  const [loading, setLoading]         = useState(false)
  const [administering, setAdministering] = useState<string | null>(null)
  const [feedback, setFeedback]       = useState<{ id: string; msg: string } | null>(null)

  useEffect(() => {
    if (!homeId) return
    setLoading(true)
    getHomeMedications(homeId)
      .then(res => setMeds(res.data.data ?? []))
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [homeId])

  async function administer(medId: string, outcome: MedicationOutcome) {
    if (administering) return
    setAdministering(medId)
    setFeedback(null)
    try {
      await administerMedication(medId, { outcome })
      setFeedback({ id: medId, msg: `Logged as ${outcome}` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error recording administration'
      setFeedback({ id: medId, msg })
    } finally {
      setAdministering(null)
    }
  }

  // Group by scheduled_time, sort keys
  const groups = meds.reduce<Record<string, Medication[]>>((acc, med) => {
    const key = med.scheduled_time ?? 'Unscheduled'
    if (!acc[key]) acc[key] = []
    acc[key]!.push(med)
    return acc
  }, {})
  const sortedTimes = Object.keys(groups).sort()

  return (
    <div className='pb-20 min-h-screen bg-gray-50'>
      <div className='bg-white px-4 pt-5 pb-3 border-b border-gray-100'>
        <h1 className='text-xl font-bold text-gray-900 mb-3'>Medications</h1>

        {homes.length > 1 && (
          <select
            value={homeId ?? ''}
            onChange={e => selectHome(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white'
          >
            {homes.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading && <p className='p-4 text-sm text-gray-500'>Loading…</p>}
      {!loading && meds.length === 0 && homeId && (
        <p className='p-4 text-sm text-gray-500'>No medications scheduled</p>
      )}

      {sortedTimes.map(time => (
        <div key={time} className='mt-3'>
          <h2 className='px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-gray-100'>
            {time}
          </h2>
          <div className='divide-y divide-gray-100'>
            {groups[time]!.map(med => (
              <div key={med.id} className='bg-white p-4'>
                <p className='font-medium text-gray-900 text-sm'>{med.name}</p>
                <p className='text-xs text-gray-500 mt-0.5'>{med.dosage} · {med.frequency}</p>
                {med.instructions && (
                  <p className='text-xs text-gray-400 mt-0.5'>{med.instructions}</p>
                )}
                {feedback?.id === med.id && (
                  <p className='text-xs text-blue-600 mt-1'>{feedback.msg}</p>
                )}
                <div className='flex gap-2 mt-3 flex-wrap'>
                  {OUTCOMES.map(o => (
                    <button
                      key={o.value}
                      onClick={() => void administer(med.id, o.value)}
                      disabled={administering === med.id}
                      className={`px-3 py-2 rounded-lg text-xs font-medium min-h-[44px] disabled:opacity-50 ${o.classes}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <BottomNav />
    </div>
  )
}
