import { useState, useEffect } from 'react'
import { ClipboardCheck } from 'lucide-react'
import type { Home } from '../../../api/homes'
import { getOrgIposCompliance, type IposCompliance } from '../../../api/orgs'
import { cn } from '../../../lib/cn'
import { todayStr } from '../../../utils/date'

interface Props {
  selectedHomeId: string
  homes: Home[]
}

function ComplianceBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className='flex items-center gap-3'>
      <div className='flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden'>
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('text-xs font-semibold tabular-nums w-8 text-right', textColor)}>
        {pct}%
      </span>
    </div>
  )
}

export default function IposTab({ selectedHomeId }: Props) {
  const [date,     setDate]     = useState(todayStr())
  const [data,     setData]     = useState<IposCompliance[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    setLoading(true)
    getOrgIposCompliance(date)
      .then(res => setData(res.data.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [date])

  const filtered = selectedHomeId === 'all'
    ? data
    : data.filter(d => d.home_id === selectedHomeId)

  const overall = filtered.length
    ? Math.round(filtered.reduce((sum, d) => sum + d.percentage, 0) / filtered.length)
    : 0

  return (
    <div className='pb-4'>
      {/* Date picker */}
      <div className='px-4 pt-4 pb-2'>
        <label className='block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5'>
          Date
        </label>
        <input
          type='date'
          value={date}
          onChange={e => setDate(e.target.value)}
          className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
        />
      </div>

      {/* Overall summary */}
      {!loading && filtered.length > 0 && (
        <div className='mx-4 mt-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5'>
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center gap-2'>
              <ClipboardCheck size={16} className='text-indigo-400' />
              <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                Overall Compliance
              </p>
            </div>
            <span className={cn(
              'text-sm font-bold',
              overall >= 80 ? 'text-emerald-400' : overall >= 50 ? 'text-amber-400' : 'text-red-400'
            )}>
              {overall}%
            </span>
          </div>
          <ComplianceBar pct={overall} />
          <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-2'>
            {filtered.filter(d => d.percentage >= 80).length} of {filtered.length} home{filtered.length !== 1 ? 's' : ''} at 80%+
          </p>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className='px-4 pt-3 space-y-3'>
          {[0, 1, 2].map(i => (
            <div key={i} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 animate-pulse'>
              <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2' />
              <div className='h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full' />
            </div>
          ))}
        </div>
      )}

      {/* Per-home bars */}
      {!loading && filtered.length === 0 && (
        <div className='mx-4 mt-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center'>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No data for this date.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className='px-4 pt-3 space-y-2'>
          {filtered
            .sort((a, b) => a.percentage - b.percentage)
            .map(row => (
              <div key={row.home_id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5'>
                <div className='flex items-center justify-between mb-2'>
                  <p className='text-sm font-semibold text-zinc-900 dark:text-white truncate flex-1 min-w-0 mr-3'>
                    {row.home_name}
                  </p>
                  <p className='text-xs text-zinc-400 dark:text-zinc-500 shrink-0'>
                    {row.filed_count}/{row.total_residents} residents
                  </p>
                </div>
                <ComplianceBar pct={row.percentage} />
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
