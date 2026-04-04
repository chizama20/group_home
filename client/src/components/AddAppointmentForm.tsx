import { useState } from 'react'
import { createAppointment } from '../api/appointments'
import type { Resident } from '../types/resident'
import { todayStr } from '../utils/date'

const APPOINTMENT_TYPES = ['GP Visit', 'Therapy', 'Hospital', 'Specialist', 'Pickup', 'Outing'] as const
type AppointmentType = typeof APPOINTMENT_TYPES[number]

const COLLECTOR_TYPES: AppointmentType[] = ['Pickup', 'Outing']

interface Props {
  homeId:      string
  residentId?: string
  residents?:  Resident[]
  onSuccess:   () => void
  onCancel:    () => void
}

export default function AddAppointmentForm({ homeId, residentId, residents = [], onSuccess, onCancel }: Props) {
  const [selectedResident, setSelectedResident] = useState(residentId ?? '')
  const [type,             setType]             = useState<AppointmentType>('GP Visit')
  const [title,            setTitle]            = useState('')
  const [date,             setDate]             = useState(todayStr())
  const [time,             setTime]             = useState('')
  const [location,         setLocation]         = useState('')
  const [notes,            setNotes]            = useState('')
  const [collectorName,    setCollectorName]    = useState('')
  const [collectorPhone,   setCollectorPhone]   = useState('')
  const [submitting,       setSubmitting]       = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  const showCollector = COLLECTOR_TYPES.includes(type)
  const canSubmit = title.trim() && date && (residentId || selectedResident) && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await createAppointment(homeId, {
        resident_id:      residentId ?? selectedResident,
        type,
        title:            title.trim(),
        appointment_date: date,
        appointment_time: time || undefined,
        location:         location.trim() || undefined,
        notes:            notes.trim()    || undefined,
        collector_name:   collectorName.trim()  || undefined,
        collector_phone:  collectorPhone.trim() || undefined,
      })
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment')
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-xl md:rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 pb-8 max-h-[92vh] overflow-y-auto'>
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />
        <div className='px-4 pt-4'>
          <h2 className='text-base font-bold text-zinc-900 dark:text-white mb-4'>New Appointment</h2>

          {!residentId && (
            <div className='mb-3'>
              <label className={labelClass}>
                Resident <span className='text-red-500'>*</span>
              </label>
              <select
                value={selectedResident}
                onChange={e => setSelectedResident(e.target.value)}
                className={inputClass}
              >
                <option value=''>Select resident…</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className='mb-3'>
            <label className={labelClass}>Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as AppointmentType)}
              className={inputClass}
            >
              {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className='mb-3'>
            <label className={labelClass}>
              Title <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='e.g. Annual checkup with Dr. Smith'
              className={inputClass}
            />
          </div>

          <div className='flex gap-3 mb-3'>
            <div className='flex-1'>
              <label className={labelClass}>
                Date <span className='text-red-500'>*</span>
              </label>
              <input
                type='date'
                value={date}
                onChange={e => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className='flex-1'>
              <label className={labelClass}>Time</label>
              <input
                type='time'
                value={time}
                onChange={e => setTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className='mb-3'>
            <label className={labelClass}>Location</label>
            <input
              type='text'
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder='Hospital, clinic address…'
              className={inputClass}
            />
          </div>

          {showCollector && (
            <div className='flex gap-3 mb-3'>
              <div className='flex-1'>
                <label className={labelClass}>Collector name</label>
                <input
                  type='text'
                  value={collectorName}
                  onChange={e => setCollectorName(e.target.value)}
                  placeholder='Name…'
                  className={inputClass}
                />
              </div>
              <div className='flex-1'>
                <label className={labelClass}>Phone</label>
                <input
                  type='tel'
                  value={collectorPhone}
                  onChange={e => setCollectorPhone(e.target.value)}
                  placeholder='Number…'
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div className='mb-4'>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Any additional notes…'
              rows={2}
              className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500'
            />
          </div>

          {error && (
            <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg mb-3'>{error}</p>
          )}

          <div className='flex gap-3'>
            <button
              onClick={onCancel}
              className='flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 min-h-[44px] transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={() => { void handleSubmit() }}
              disabled={!canSubmit}
              className='flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 transition-colors'
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
