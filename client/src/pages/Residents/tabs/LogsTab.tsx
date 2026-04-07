import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { getResidentIpos } from '../../../api/logs'
import type { IposLog } from '../../../types/log'
import { formatDate } from '../../../utils/date'

const STATUS_STYLES: Record<IposLog['status'], string> = {
  draft:          'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
  submitted:      'bg-amber-500/10 text-amber-500',
  approved:       'bg-emerald-500/10 text-emerald-400',
  needs_revision: 'bg-red-500/10 text-red-400',
}

const STATUS_LABELS: Record<IposLog['status'], string> = {
  draft:          'Draft',
  submitted:      'Pending Review',
  approved:       'Approved',
  needs_revision: 'Needs Revision',
}

export default function LogsTab({ residentId }: { residentId: string }) {
  const [logs, setLogs]       = useState<IposLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getResidentIpos(residentId)
      .then(res => {
        const data = res.data.data ?? []
        setLogs([...data].sort((a, b) => b.created_at.localeCompare(a.created_at)))
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [residentId])

  if (loading) return (
    <div className='p-4 space-y-2'>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl h-14 animate-pulse'
        />
      ))}
    </div>
  )

  if (!logs.length) return (
    <div className='p-4'>
      <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center'>
        <p className='text-sm text-zinc-500 dark:text-zinc-400'>No IPOS logs yet.</p>
      </div>
    </div>
  )

  return (
    <div className='p-4'>
      {logs.map(log => (
        <div
          key={log.id}
          className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden mb-2'
        >
          <div className='flex items-center gap-3 px-4 min-h-[56px]'>
            {/* Date + label */}
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold text-zinc-900 dark:text-white leading-tight'>
                {formatDate(log.log_date)}
              </p>
              <p className='text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5'>Log</p>
            </div>

            {/* Status badge */}
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[log.status]}`}>
              {STATUS_LABELS[log.status]}
            </span>

            {/* Chevron */}
            <ChevronRight className='h-4 w-4 text-zinc-400 flex-shrink-0' />
          </div>
        </div>
      ))}
    </div>
  )
}
