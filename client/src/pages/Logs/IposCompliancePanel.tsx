import { useState, useEffect } from 'react'
import { getIposCompliance } from '../../api/homes'
import type { IposComplianceShift } from '../../api/homes'
import { todayStr } from '../../utils/date'
import type { ShiftType } from '../../types/schedule'

const SHIFT_ORDER: ShiftType[] = ['day', 'evening', 'night']

const SHIFT_LABELS: Record<ShiftType, string> = {
  day:     'Daytime coverage',
  evening: 'Evening coverage',
  night:   'Overnight coverage',
}

interface Props {
  homeId: string
}

export default function IposCompliancePanel({ homeId }: Props) {
  const [date, setDate]       = useState(todayStr())
  const [data, setData]       = useState<IposComplianceShift[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getIposCompliance(homeId, date)
      .then(res => setData(res.data.data ?? []))
      .catch(() => {/* non-critical */})
      .finally(() => setLoading(false))
  }, [homeId, date])

  const byShift = new Map(data.map(d => [d.shift, d]))

  return (
    <div className='pb-4'>
      {/* Date picker row */}
      <div className='flex items-center gap-3 px-4 pt-4 pb-2'>
        <label className='text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide shrink-0'>Date</label>
        <input
          type='date'
          value={date}
          onChange={e => setDate(e.target.value)}
          className='border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[40px]'
        />
      </div>

      {/* Skeleton */}
      {loading && (
        <div className='pt-1'>
          {[0,1,2].map(i => (
            <div key={i} className='mx-4 mb-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden animate-pulse'>
              <div className='px-4 py-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800'>
                <div className='space-y-1.5'>
                  <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-20' />
                  <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-28' />
                </div>
                <div className='h-5 bg-zinc-100 dark:bg-zinc-800 rounded w-12' />
              </div>
              <div className='h-1.5 bg-zinc-100 dark:bg-zinc-800' />
            </div>
          ))}
        </div>
      )}

      {!loading && SHIFT_ORDER.map(shift => {
        const row     = byShift.get(shift)
        const total   = row?.total_residents ?? 0
        const filed   = row?.filed_count ?? 0
        const pending = row?.pending_residents ?? []
        const pct     = total > 0 ? Math.round((filed / total) * 100) : 0
        const allDone = total > 0 && filed === total

        return (
          <div key={shift} className='mx-4 mb-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden'>
            {/* Header */}
            <div className='px-4 py-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800'>
              <div>
                <p className='text-sm font-semibold text-zinc-900 dark:text-white capitalize'>{shift} shift</p>
                <p className='text-xs text-zinc-400 mt-0.5'>{SHIFT_LABELS[shift]}</p>
              </div>
              <div className='text-right'>
                <span className={
                  allDone
                    ? 'text-sm font-bold text-emerald-500'
                    : filed > 0
                      ? 'text-sm font-bold text-amber-500'
                      : 'text-sm font-bold text-zinc-400 dark:text-zinc-500'
                }>
                  {filed} / {total}
                </span>
                {total > 0 && (
                  <p className='text-xs text-zinc-400 dark:text-zinc-500'>{pct}% filed</p>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className='h-1.5 bg-zinc-100 dark:bg-zinc-800'>
              <div
                className={`h-full rounded-full transition-all ${allDone ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Pending list */}
            {pending.length > 0 && (
              <div className='px-4 py-2 space-y-1'>
                {pending.map(r => (
                  <p key={r.id} className='text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0' />
                    {r.first_name} {r.last_name}
                  </p>
                ))}
              </div>
            )}

            {total === 0 && (
              <p className='px-4 py-2.5 text-xs text-zinc-400 dark:text-zinc-600'>No active residents</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
