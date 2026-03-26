import { useState, useEffect, useCallback } from 'react'
import { getResidentAppointments, completeAppointment } from '../../../api/appointments'
import type { Appointment } from '../../../types/appointment'
import { todayStr, formatDate } from '../../../utils/date'

const TYPE_CHIP: Record<string, string> = {
  'GP Visit':   'bg-blue-100 text-blue-700',
  'Therapy':    'bg-purple-100 text-purple-700',
  'Hospital':   'bg-red-100 text-red-700',
  'Specialist': 'bg-orange-100 text-orange-700',
  'Pickup':     'bg-green-100 text-green-700',
  'Outing':     'bg-teal-100 text-teal-700',
}

interface Props {
  residentId: string
  onAddAppointment: () => void
}

export default function AppointmentsTab({ residentId, onAddAppointment }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [completing, setCompleting]     = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getResidentAppointments(residentId)
      .then(res => setAppointments(res.data.data ?? []))
      .catch(() => setError('Failed to load appointments'))
      .finally(() => setLoading(false))
  }, [residentId])

  useEffect(() => { load() }, [load])

  async function handleComplete(id: string) {
    setCompleting(id)
    try {
      await completeAppointment(id)
      load()
    } finally {
      setCompleting(null)
    }
  }

  if (loading) return <p className='p-4 text-sm text-gray-500'>Loading…</p>
  if (error)   return <p className='p-4 text-sm text-red-600'>{error}</p>

  const today    = todayStr()
  const upcoming = appointments.filter(a => a.appointment_date >= today && !a.completed_at)
  const past     = appointments.filter(a => a.appointment_date <  today || !!a.completed_at)

  return (
    <div className='p-4 space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>
          Upcoming ({upcoming.length})
        </p>
        <button
          onClick={onAddAppointment}
          className='text-xs font-semibold text-blue-600 min-h-[44px] flex items-center px-2 -mr-2'
        >
          + Add
        </button>
      </div>

      {!upcoming.length && (
        <p className='text-sm text-gray-400'>No upcoming appointments</p>
      )}

      {upcoming.map(appt => (
        <div key={appt.id} className='bg-white rounded-xl shadow-sm overflow-hidden'>
          <div className='flex items-start gap-3 px-4 py-3'>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2 mb-1'>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_CHIP[appt.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {appt.type}
                </span>
              </div>
              <p className='text-sm font-semibold text-gray-900'>{appt.title}</p>
              <p className='text-xs text-gray-500 mt-0.5'>
                {formatDate(appt.appointment_date)}{appt.appointment_time ? ` · ${appt.appointment_time}` : ''}
              </p>
              {appt.location && (
                <p className='text-xs text-gray-400 mt-0.5'>{appt.location}</p>
              )}
            </div>
            <button
              disabled={completing === appt.id}
              onClick={() => { void handleComplete(appt.id) }}
              className='text-xs font-semibold text-green-700 border border-green-200 px-3 py-1.5 rounded-lg min-h-[36px] shrink-0 disabled:opacity-50'
            >
              {completing === appt.id ? '…' : 'Mark Done'}
            </button>
          </div>
        </div>
      ))}

      {past.length > 0 && (
        <>
          <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2'>
            Past ({past.length})
          </p>
          {past.map(appt => (
            <div key={appt.id} className='bg-white rounded-xl shadow-sm overflow-hidden opacity-60'>
              <div className='px-4 py-3'>
                <div className='flex items-center gap-2 mb-1'>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_CHIP[appt.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {appt.type}
                  </span>
                  {appt.completed_at && (
                    <span className='text-[10px] font-semibold text-green-600'>✓ Done</span>
                  )}
                </div>
                <p className='text-sm font-medium text-gray-900'>{appt.title}</p>
                <p className='text-xs text-gray-500 mt-0.5'>
                  {formatDate(appt.appointment_date)}{appt.appointment_time ? ` · ${appt.appointment_time}` : ''}
                </p>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
