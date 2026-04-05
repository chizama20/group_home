import { useState, useEffect } from 'react'
import { getResidentIpos, getResidentBehavioralLogs } from '../../../api/logs'
import type { IposLog, BehavioralLog } from '../../../types/log'
import { formatDate, formatTime } from '../../../utils/date'

type LogEntry =
  | { kind: 'ipos';       data: IposLog;       sortKey: string }
  | { kind: 'behavioral'; data: BehavioralLog; sortKey: string }

export default function LogsTab({ residentId }: { residentId: string }) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([
      getResidentIpos(residentId),
      getResidentBehavioralLogs(residentId),
    ]).then(([iposRes, behavRes]) => {
      const combined: LogEntry[] = []
      if (iposRes.status === 'fulfilled' && iposRes.value.data.success)
        for (const d of iposRes.value.data.data ?? [])
          combined.push({ kind: 'ipos', data: d, sortKey: d.created_at })
      if (behavRes.status === 'fulfilled' && behavRes.value.data.success)
        for (const d of behavRes.value.data.data ?? [])
          combined.push({ kind: 'behavioral', data: d, sortKey: d.created_at })
      combined.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      setEntries(combined)
    }).catch(() => setError('Failed to load logs'))
      .finally(() => setLoading(false))
  }, [residentId])

  if (loading) return (
    <div className='flex items-center justify-center min-h-[200px]'>
      <div className='w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
    </div>
  )
  if (error)   return <p className='px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400'>{error}</p>
  if (!entries.length) return <p className='text-center py-8 text-sm text-zinc-400 dark:text-zinc-600'>No logs yet</p>

  return (
    <div className='p-4 space-y-3'>
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden border-l-4 ${
            entry.kind === 'ipos' ? 'border-l-indigo-400' : 'border-l-amber-400'
          }`}
        >
          <div className='px-4 py-3'>
            <div className='flex items-center justify-between mb-1'>
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                entry.kind === 'ipos'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                {entry.kind === 'ipos' ? `IPOS · ${entry.data.shift}` : 'Behavioral'}
              </span>
              <span className='text-xs text-zinc-400 dark:text-zinc-500'>{formatDate(entry.data.created_at)}</span>
            </div>
            {entry.kind === 'ipos' && (
              <p className='text-sm text-zinc-700 dark:text-zinc-300 mt-1'>{entry.data.content}</p>
            )}
            {entry.kind === 'behavioral' && (
              <>
                {entry.data.notes && (
                  <p className='text-sm text-zinc-700 dark:text-zinc-300 mt-1'>{entry.data.notes}</p>
                )}
                <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
                  Occurred: {formatTime(entry.data.occurred_at)}
                </p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
