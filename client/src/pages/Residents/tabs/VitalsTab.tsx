import { useState, useEffect } from 'react'
import { getVitalsLogs, acknowledgeVital } from '../../../api/logs'
import type { VitalsLog } from '../../../types/log'
import { formatDateTime } from '../../../utils/date'
import { cn } from '../../../lib/cn'

const VITAL_LABELS: Record<string, string> = {
  blood_glucose:  'Blood Glucose',
  blood_pressure: 'Blood Pressure',
  weight:         'Weight',
  temperature:    'Temperature',
  o2_sat:         'O2 Sat',
  other:          'Other',
}

function vitalLabel(type: string): string {
  return VITAL_LABELS[type] ?? type
}

function ValueDisplay({ log }: { log: VitalsLog }) {
  if (log.vital_type === 'blood_pressure') {
    return (
      <span className='text-base font-semibold text-zinc-900 dark:text-white'>
        {log.value_primary} / {log.value_secondary ?? '—'} mmHg
      </span>
    )
  }

  if (log.vital_type === 'blood_glucose') {
    return (
      <span className='flex items-center gap-2 flex-wrap'>
        <span className='text-base font-semibold text-zinc-900 dark:text-white'>
          {log.value_primary} {log.unit ?? 'mg/dL'}
        </span>
        {log.meal_timing && (
          <span className='text-[11px] font-medium bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full'>
            {log.meal_timing}
          </span>
        )}
      </span>
    )
  }

  return (
    <span className='text-base font-semibold text-zinc-900 dark:text-white'>
      {log.value_primary}{log.unit ? ` ${log.unit}` : ''}
    </span>
  )
}

export default function VitalsTab({ residentId }: { residentId: string }) {
  const [logs, setLogs]               = useState<VitalsLog[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeType, setActiveType]   = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)

  function fetchLogs() {
    setLoading(true)
    getVitalsLogs(residentId)
      .then(res => {
        const data = res.data.data ?? []
        setLogs([...data].sort((a, b) => b.created_at.localeCompare(a.created_at)))
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [residentId])

  async function handleAcknowledge(logId: string) {
    setAcknowledging(logId)
    try {
      await acknowledgeVital(logId)
      fetchLogs()
    } finally {
      setAcknowledging(null)
    }
  }

  // Unique vital types in the loaded logs, preserving insertion order
  const uniqueTypes = Array.from(new Set(logs.map(l => l.vital_type)))

  const filtered = activeType === null
    ? logs
    : logs.filter(l => l.vital_type === activeType)

  if (loading) return (
    <div className='p-4 space-y-2'>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg h-20 animate-pulse'
        />
      ))}
    </div>
  )

  if (!logs.length) return (
    <div className='p-4'>
      <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center'>
        <p className='text-sm text-zinc-500 dark:text-zinc-400'>No vitals recorded yet.</p>
      </div>
    </div>
  )

  return (
    <div className='p-4'>
      {/* Filter chips */}
      <div
        className='flex gap-2 mb-4 overflow-x-auto pb-1'
        style={{ scrollbarWidth: 'none' }}
      >
        {/* "All" chip */}
        <button
          onClick={() => setActiveType(null)}
          className={cn(
            'flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border min-h-[32px] transition-colors',
            activeType === null
              ? 'bg-primary text-white border-primary'
              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
          )}
        >
          All
        </button>

        {uniqueTypes.map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              'flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border min-h-[32px] transition-colors',
              activeType === type
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
            )}
          >
            {vitalLabel(type)}
          </button>
        ))}
      </div>

      {/* Vitals list */}
      {filtered.map(log => (
        <div
          key={log.id}
          className={cn(
            'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-2',
            log.is_flagged && 'border-l-4 border-l-red-500'
          )}
        >
          {/* Row 1: type label + date/time */}
          <div className='flex items-center justify-between mb-1.5'>
            <span className='text-sm font-bold text-zinc-900 dark:text-white'>
              {vitalLabel(log.vital_type)}
            </span>
            <span className='text-xs text-zinc-400 dark:text-zinc-500'>
              {formatDateTime(log.created_at)}
            </span>
          </div>

          {/* Row 2: value */}
          <div className='mb-1.5'>
            <ValueDisplay log={log} />
          </div>

          {/* Row 3: flagged / acknowledged / notes */}
          {log.is_flagged && (
            <div className='flex items-center gap-2 mt-2 flex-wrap'>
              <span className='text-[11px] font-semibold bg-red-500/10 text-red-500 px-2.5 py-0.5 rounded-full'>
                Flagged
              </span>

              {log.acknowledged_at ? (
                <span className='text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full'>
                  Acknowledged
                </span>
              ) : (
                <button
                  disabled={acknowledging === log.id}
                  onClick={() => { void handleAcknowledge(log.id) }}
                  className='text-xs font-medium border border-red-200 dark:border-red-900/40 text-red-500 px-3 py-1 rounded-full min-h-[36px] disabled:opacity-50 transition-opacity'
                >
                  {acknowledging === log.id ? 'Acknowledging…' : 'Acknowledge'}
                </button>
              )}
            </div>
          )}

          {log.notes && (
            <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-2'>{log.notes}</p>
          )}
        </div>
      ))}
    </div>
  )
}
