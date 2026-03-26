import { useState } from 'react'
import { createAppointment } from '../api/appointments'
import type { Resident } from '../types/resident'
import { todayStr } from '../utils/date'

const APPOINTMENT_TYPES = ['GP Visit', 'Therapy', 'Hospital', 'Specialist', 'Pickup', 'Outing'] as const
type AppointmentType = typeof APPOINTMENT_TYPES[number]

const COLLECTOR_TYPES: AppointmentType[] = ['Pickup', 'Outing']

interface Props {
  homeId:      string
  /** Pre-fill and lock the resident. If omitted, a resident selector is shown. */
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
        resident_id:     residentId ?? selectedResident,
        type,
        title:           title.trim(),
        appointment_date: date,
        appointment_time: time || undefined,
        location:        location.trim() || undefined,
        notes:           notes.trim()    || undefined,
        collector_name:  collectorName.trim()  || undefined,
        collector_phone: collectorPhone.trim() || undefined,
      })
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment')
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 pb-8 max-h-[92vh] overflow-y-auto'>
        <div className='w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3' />
        <div className='px-4 pt-4'>
          <h2 className='text-base font-bold text-gray-900 mb-4'>New Appointment</h2>

          {/* Resident — only shown when not pre-filled */}
          {!residentId && (
            <div className='mb-3'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Resident <span className='text-red-500'>*</span>
              </label>
              <select
                value={selectedResident}
                onChange={e => setSelectedResident(e.target.value)}
                className='w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white min-h-[44px]'
              >
                <option value=''>Select resident…</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Type */}
          <div className='mb-3'>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as AppointmentType)}
              className='w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white min-h-[44px]'
            >
              {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Title */}
          <div className='mb-3'>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Title <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='e.g. Annual checkup with Dr. Smith'
              className='w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]'
            />
          </div>

          {/* Date + Time row */}
          <div className='flex gap-3 mb-3'>
            <div className='flex-1'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Date <span className='text-red-500'>*</span>
              </label>
              <input
                type='date'
                value={date}
                onChange={e => setDate(e.target.value)}
                className='w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]'
              />
            </div>
            <div className='flex-1'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Time</label>
              <input
                type='time'
                value={time}
                onChange={e => setTime(e.target.value)}
                className='w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]'
              />
            </div>
          </div>

          {/* Location */}
          <div className='mb-3'>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Location</label>
            <input
              type='text'
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder='Hospital, clinic address…'
              className='w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]'
            />
          </div>

          {/* Collector — Pickup / Outing only */}
          {showCollector && (
            <div className='flex gap-3 mb-3'>
              <div className='flex-1'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Collector name</label>
                <input
                  type='text'
                  value={collectorName}
                  onChange={e => setCollectorName(e.target.value)}
                  placeholder='Name…'
                  className='w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]'
                />
              </div>
              <div className='flex-1'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Phone</label>
                <input
                  type='tel'
                  value={collectorPhone}
                  onChange={e => setCollectorPhone(e.target.value)}
                  placeholder='Number…'
                  className='w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]'
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className='mb-4'>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Any additional notes…'
              rows={2}
              className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          {error && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3'>{error}</p>
          )}

          <div className='flex gap-3'>
            <button
              onClick={onCancel}
              className='flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 min-h-[44px]'
            >
              Cancel
            </button>
            <button
              onClick={() => { void handleSubmit() }}
              disabled={!canSubmit}
              className='flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
