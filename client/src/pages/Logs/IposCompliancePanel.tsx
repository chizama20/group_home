import { useState, useEffect } from 'react'
import { getIposCompliance } from '../../api/homes'
import type { IposComplianceShift } from '../../api/homes'
import { todayStr } from '../../utils/date'
import { SHIFT_LABELS } from '../../types/log'
import type { Shift } from '../../types/log'

const SHIFT_ORDER: Shift[] = ['day', 'evening', 'night']

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
    <div className='p-4 space-y-4'>
      <div className='flex items-center gap-3'>
        <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0'>Date</label>
        <input
          type='date'
          value={date}
          onChange={e => setDate(e.target.value)}
          className='border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-h-[40px]'
        />
      </div>

      {loading && <p className='text-sm text-gray-500'>Loading…</p>}

      {SHIFT_ORDER.map(shift => {
        const row     = byShift.get(shift)
        const total   = row?.total_residents ?? 0
        const filed   = row?.filed_count ?? 0
        const pending = row?.pending_residents ?? []
        const pct     = total > 0 ? Math.round((filed / total) * 100) : 0
        const allDone = total > 0 && filed === total

        return (
          <div key={shift} className='bg-white rounded-xl shadow-sm overflow-hidden'>
            <div className='px-4 py-3 flex items-center justify-between border-b border-gray-100'>
              <div>
                <p className='text-sm font-semibold text-gray-900 capitalize'>{shift} shift</p>
                <p className='text-xs text-gray-400 mt-0.5'>{SHIFT_LABELS[shift]}</p>
              </div>
              <div className='text-right'>
                <span className={`text-sm font-bold ${
                  allDone   ? 'text-green-600' :
                  filed > 0 ? 'text-amber-600' :
                              'text-gray-400'
                }`}>
                  {filed} / {total}
                </span>
                {total > 0 && (
                  <p className='text-xs text-gray-400'>{pct}% filed</p>
                )}
              </div>
            </div>

            <div className='h-1.5 bg-gray-100'>
              <div
                className={`h-full transition-all ${allDone ? 'bg-green-500' : 'bg-amber-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {pending.length > 0 && (
              <div className='px-4 py-2.5'>
                <p className='text-xs text-gray-400 mb-1.5'>Pending:</p>
                <div className='flex flex-wrap gap-1.5'>
                  {pending.map(r => (
                    <span key={r.id} className='text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100'>
                      {r.first_name} {r.last_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {total === 0 && !loading && (
              <p className='px-4 py-2.5 text-xs text-gray-400'>No active residents</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
