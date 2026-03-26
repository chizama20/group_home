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

  if (loading) return <p className='p-4 text-sm text-gray-500'>Loading…</p>
  if (error)   return <p className='p-4 text-sm text-red-600'>{error}</p>
  if (!entries.length) return <p className='p-4 text-sm text-gray-500'>No logs yet</p>

  return (
    <div className='p-4 space-y-3'>
      {entries.map((entry, i) => (
        <div key={i} className={`bg-white rounded-xl shadow-sm overflow-hidden border-l-4 ${
          entry.kind === 'ipos' ? 'border-blue-400' : 'border-amber-400'
        }`}>
          <div className='px-4 py-3'>
            <div className='flex items-center justify-between mb-1'>
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                entry.kind === 'ipos'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-amber-50 text-amber-600'
              }`}>
                {entry.kind === 'ipos' ? `IPOS · ${entry.data.shift}` : 'Behavioral'}
              </span>
              <span className='text-xs text-gray-400'>{formatDate(entry.data.created_at)}</span>
            </div>
            {entry.kind === 'ipos' && (
              <p className='text-sm text-gray-700 mt-1'>{entry.data.content}</p>
            )}
            {entry.kind === 'behavioral' && (
              <>
                {entry.data.notes && (
                  <p className='text-sm text-gray-700 mt-1'>{entry.data.notes}</p>
                )}
                <p className='text-xs text-gray-400 mt-1'>
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
