import { useState, useEffect } from 'react'
import { getHomeBehavioralLogs, createBehavioralLog } from '../../api/logs'
import { getBehaviors } from '../../api/residents'
import type { BehavioralLog } from '../../types/log'
import type { Resident, TrackedBehavior } from '../../types/resident'
import { formatDate, formatTime } from '../../utils/date'
import { cn } from '../../lib/cn'
import { useRole } from '../../utils/role'
import ExportSheet from './ExportSheet'

interface Props {
  homeId:    string
  residents: Resident[]
}

export default function BehavioralTab({ homeId, residents }: Props) {
  const { isManagerOrAbove }          = useRole()
  const [showExport, setShowExport]   = useState(false)
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
        const activeBehaviors = res.data.data?.filter(b => b.is_active) ?? []
        setBehaviors(activeBehaviors)
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
      <div className='bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 space-y-4'>
        <div className='flex items-center justify-between'>
          <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>Log Behavior</p>
          {isManagerOrAbove && (
            <button
              onClick={() => setShowExport(true)}
              className='text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-lg px-3 py-1.5 min-h-[36px] transition-colors'
            >
              Export PDF
            </button>
          )}
        </div>

        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Resident</label>
          <select
            value={residentId}
            onChange={e => setResidentId(e.target.value)}
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px]'
          >
            <option value=''>Select resident…</option>
            {active.map(r => (
              <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
            ))}
          </select>
        </div>

        {residentId && behaviors.length === 0 && (
          <p className='text-sm text-zinc-400 dark:text-zinc-600'>No tracked behaviors configured for this resident</p>
        )}

        {behaviors.length > 0 && (
          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2'>Behavior</label>
            <div className='flex flex-wrap gap-2'>
              {behaviors.map(b => (
                <button
                  key={b.id}
                  onClick={() => setBehaviorId(b.id)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-sm font-medium border min-h-[44px] transition-all',
                    behaviorId === b.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
            Time occurred <span className='text-red-500'>*</span>
          </label>
          <input
            type='datetime-local'
            value={occurredAt}
            onChange={e => setOccurredAt(e.target.value)}
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px]'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Duration (minutes)</label>
          <input
            type='number'
            min='1'
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder='Optional'
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px]'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder='Optional…'
            rows={2}
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-400'
          />
        </div>

        {error && (
          <div className='bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
            {error}
          </div>
        )}
        {success && (
          <div className='bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-3 py-2 rounded-xl'>
            Behavioral log submitted
          </div>
        )}

        <button
          onClick={() => { void handleSubmit() }}
          disabled={!residentId || !behaviorId || !occurredAt || submitting}
          className='w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>

      {/* Log feed */}
      <div className='p-4 space-y-3'>
        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3'>Recent Entries</p>

        {logsLoading && (
          <>
            {[0,1,2].map(i => (
              <div key={i} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2 animate-pulse'>
                <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3' />
                <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2' />
                <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3' />
              </div>
            ))}
          </>
        )}

        {!logsLoading && !logs.length && (
          <p className='text-center text-sm text-zinc-400 dark:text-zinc-600 py-6'>No behavioral logs yet</p>
        )}

        {logs.map(log => (
          <div key={log.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 border-l-4 border-l-amber-400'>
            <div className='flex items-center mb-0.5'>
              <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                {log.resident_first} {log.resident_last}
              </p>
              <span className='text-xs text-zinc-400 ml-auto'>{formatTime(log.occurred_at)}</span>
            </div>
            <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
              {log.behavior_name ?? 'Behavior'}
            </p>
            {log.notes && (
              <p className='text-sm text-zinc-600 dark:text-zinc-400 mt-1.5'>{log.notes}</p>
            )}
            <p className='text-xs text-zinc-300 dark:text-zinc-600 mt-1'>{formatDate(log.created_at)}</p>
          </div>
        ))}
      </div>

      {showExport && (
        <ExportSheet
          homeId={homeId}
          residents={residents}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
