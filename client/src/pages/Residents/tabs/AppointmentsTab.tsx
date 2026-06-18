import { useState, useEffect, useCallback } from 'react'
import { Check } from 'lucide-react'
import { getResidentAppointments, completeAppointment } from '../../../api/appointments'
import type { Appointment } from '../../../types/appointment'
import { todayStr, formatDate } from '../../../utils/date'

const TYPE_CHIP: Record<string, string> = {
  'GP Visit':   'bg-primary/10 text-primary',
  'Therapy':    'bg-violet-500/10 text-violet-400',
  'Hospital':   'bg-red-500/10 text-red-400',
  'Specialist': 'bg-orange-500/10 text-orange-400',
  'Pickup':     'bg-emerald-500/10 text-emerald-400',
  'Outing':     'bg-teal-500/10 text-teal-400',
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

  if (loading) return (
    <div className='flex items-center justify-center min-h-[200px]'>
      <div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' />
    </div>
  )
  if (error) return <p className='p-4 text-sm text-zinc-500 dark:text-zinc-400'>{error}</p>

  const today    = todayStr()
  const upcoming = appointments.filter(a => a.appointment_date >= today && !a.completed_at)
  const past     = appointments.filter(a => a.appointment_date <  today || !!a.completed_at)

  return (
    <div className='p-4 space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide'>
          Upcoming ({upcoming.length})
        </p>
        <button
          onClick={onAddAppointment}
          className='text-xs font-semibold text-primary dark:text-primary min-h-[44px] flex items-center px-2 -mr-2'
        >
          + Add
        </button>
      </div>

      {!upcoming.length && (
        <p className='text-sm text-zinc-400 dark:text-zinc-600'>No upcoming appointments</p>
      )}

      {upcoming.map(appt => (
        <div key={appt.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden'>
          <div className='flex items-start gap-3 px-4 py-3'>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2 mb-1'>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_CHIP[appt.type] ?? 'bg-zinc-500/10 text-zinc-400'}`}>
                  {appt.type}
                </span>
              </div>
              <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{appt.title}</p>
              <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
                {formatDate(appt.appointment_date)}{appt.appointment_time ? ` · ${appt.appointment_time}` : ''}
              </p>
              {appt.location && (
                <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-0.5'>{appt.location}</p>
              )}
            </div>
            <button
              disabled={completing === appt.id}
              onClick={() => { void handleComplete(appt.id) }}
              className='text-xs font-semibold text-emerald-500 border border-emerald-500/30 dark:border-emerald-500/20 px-3 py-1.5 rounded-lg min-h-[36px] shrink-0 disabled:opacity-50'
            >
              {completing === appt.id ? '…' : 'Mark Done'}
            </button>
          </div>
        </div>
      ))}

      {past.length > 0 && (
        <>
          <p className='text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide pt-2'>
            Past ({past.length})
          </p>
          {past.map(appt => (
            <div key={appt.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden opacity-60'>
              <div className='px-4 py-3'>
                <div className='flex items-center gap-2 mb-1'>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_CHIP[appt.type] ?? 'bg-zinc-500/10 text-zinc-400'}`}>
                    {appt.type}
                  </span>
                  {appt.completed_at && (
                    <span className='inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-500'>
                      <Check className='w-3 h-3' /> Done
                    </span>
                  )}
                </div>
                <p className='text-sm font-medium text-zinc-900 dark:text-white'>{appt.title}</p>
                <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
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
