import { useState, useEffect } from 'react'
import { getHomeBehavioralLogs, createBehavioralLog } from '../../api/logs'
import { getBehaviors } from '../../api/residents'
import type { BehavioralLog } from '../../types/log'
import type { Resident, TrackedBehavior } from '../../types/resident'
import { formatDate, formatTime } from '../../utils/date'
import { cn } from '../../lib/cn'

interface Props {
  homeId:    string
  residents: Resident[]
}

export default function BehavioralTab({ homeId, residents }: Props) {
  const [logs, setLogs]               = useState<BehavioralLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  // Form state
  const [residentId, setResidentId]   = useState('')
  const [behaviors, setBehaviors]     = useState<TrackedBehavior[]>([])
  const [behaviorId, setBehaviorId]   = useState('')
  const [occurredAt, setOccurredAt]   = useState('')
  const [duration, setDuration]       = useState('')
  const [notes, setNotes]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)

  const active = residents.filter(r => r.is_active)

  useEffect(() => {
    setLogsLoading(true)
    getHomeBehavioralLogs(homeId)
      .then(res => setLogs(res.data.data ?? []))
      .catch(() => {/* non-critical */})
      .finally(() => setLogsLoading(false))
  }, [homeId])

  useEffect(() => {
    if (!residentId) { setBehaviors([]); setBehaviorId(''); return }
    getBehaviors(residentId)
      .then(res => {
        const active = res.data.data?.filter(b => b.is_active) ?? []
        setBehaviors(active)
        setBehaviorId('')
      })
      .catch(() => setBehaviors([]))
  }, [residentId])

  async function handleSubmit() {
    if (!residentId || !behaviorId || !occurredAt) return
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      const notesValue = [
        duration ? `Duration: ${duration} min` : '',
        notes,
      ].filter(Boolean).join('\n') || undefined

      await createBehavioralLog(homeId, { resident_id: residentId, behavior_id: behaviorId, notes: notesValue, occurred_at: occurredAt })

      // Reset form
      setResidentId('')
      setBehaviorId('')
      setOccurredAt('')
      setDuration('')
      setNotes('')
      setSuccess(true)

      // Refresh log feed
      const res = await getHomeBehavioralLogs(homeId)
      setLogs(res.data.data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Form */}
      <div className='bg-white border-b border-gray-100 p-4 space-y-3'>
        <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Log Behavior</p>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Resident</label>
          <select
            value={residentId}
            onChange={e => setResidentId(e.target.value)}
            className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm min-h-[44px] bg-white'
          >
            <option value=''>Select resident…</option>
            {active.map(r => (
              <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
            ))}
          </select>
        </div>

        {residentId && behaviors.length === 0 && (
          <p className='text-sm text-gray-400'>No tracked behaviors configured for this resident</p>
        )}

        {behaviors.length > 0 && (
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Behavior</label>
            <div className='flex flex-wrap gap-2'>
              {behaviors.map(b => (
                <button
                  key={b.id}
                  onClick={() => setBehaviorId(b.id)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-sm font-medium border min-h-[44px]',
                    behaviorId === b.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Time occurred <span className='text-red-500'>*</span>
          </label>
          <input
            type='datetime-local'
            value={occurredAt}
            onChange={e => setOccurredAt(e.target.value)}
            className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm min-h-[44px]'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Duration (minutes)</label>
          <input
            type='number'
            min='1'
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder='Optional'
            className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm min-h-[44px]'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder='Optional…'
            rows={2}
            className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {error && (
          <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{error}</p>
        )}
        {success && (
          <p className='text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg'>Behavioral log submitted</p>
        )}

        <button
          onClick={() => { void handleSubmit() }}
          disabled={!residentId || !behaviorId || !occurredAt || submitting}
          className='w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>

      {/* Log feed */}
      <div className='p-4 space-y-3'>
        <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Recent Entries</p>
        {logsLoading && <p className='text-sm text-gray-500'>Loading…</p>}
        {!logsLoading && !logs.length && (
          <p className='text-sm text-gray-400'>No behavioral logs yet</p>
        )}
        {logs.map(log => (
          <div key={log.id} className='bg-white rounded-xl shadow-sm px-4 py-3 border-l-4 border-amber-400'>
            <div className='flex items-center justify-between mb-1'>
              <p className='text-sm font-semibold text-gray-900'>
                {log.resident_first} {log.resident_last}
              </p>
              <span className='text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium'>
                {log.behavior_name ?? 'Behavior'}
              </span>
            </div>
            <p className='text-xs text-gray-400'>Occurred: {formatTime(log.occurred_at)}</p>
            {log.notes && <p className='text-sm text-gray-700 mt-1'>{log.notes}</p>}
            <p className='text-xs text-gray-300 mt-1'>{formatDate(log.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
