import { useState } from 'react'
import { ClipboardCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Home } from '../../../api/homes'
import { cn } from '../../../lib/cn'
import { todayStr } from '../../../utils/date'

// Placeholder compliance data per home
interface HomeCompliance {
  homeId: string
  homeName: string
  totalResidents: number
  completedLogs: number
  percentage: number
}

// Placeholder data - empty for now
const PLACEHOLDER_COMPLIANCE: HomeCompliance[] = []

interface Props {
  selectedHomeId: string
  homes: Home[]
}

export default function IposTab({ selectedHomeId }: Props) {
  const [date, setDate] = useState(todayStr())

  // Filter by home if specific home selected
  const complianceData = selectedHomeId === 'all'
    ? PLACEHOLDER_COMPLIANCE
    : PLACEHOLDER_COMPLIANCE.filter(c => c.homeId === selectedHomeId)

  function getComplianceColor(percentage: number): { bar: string; text: string; bg: string } {
    if (percentage >= 90) {
      return {
        bar: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
      }
    }
    if (percentage >= 70) {
      return {
        bar: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10',
      }
    }
    return {
      bar: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
    }
  }

  function getStatusIcon(percentage: number) {
    if (percentage >= 90) return <CheckCircle2 size={16} className='text-emerald-500' />
    if (percentage >= 70) return <AlertCircle size={16} className='text-amber-500' />
    return <AlertCircle size={16} className='text-red-500' />
  }

  return (
    <div className='pb-4'>
      {/* Date picker */}
      <div className='px-4 pt-4 pb-2'>
        <div className='flex items-center gap-3'>
          <label className='text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide shrink-0'>
            Date
          </label>
          <input
            type='date'
            value={date}
            onChange={e => setDate(e.target.value)}
            className='border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[40px]'
          />
        </div>
      </div>

      {/* Legend */}
      <div className='px-4 pt-2 pb-4'>
        <div className='flex flex-wrap gap-4 text-xs'>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-full bg-emerald-500' />
            <span className='text-zinc-500 dark:text-zinc-400'>90%+ Complete</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-full bg-amber-500' />
            <span className='text-zinc-500 dark:text-zinc-400'>70-89% Complete</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-full bg-red-500' />
            <span className='text-zinc-500 dark:text-zinc-400'>Below 70%</span>
          </div>
        </div>
      </div>

      {/* Compliance cards */}
      {complianceData.length === 0 ? (
        <div className='mx-4'>
          <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center'>
            <ClipboardCheck size={32} className='text-zinc-300 dark:text-zinc-700 mx-auto mb-2' />
            <p className='text-sm text-zinc-500 dark:text-zinc-400'>
              No IPOS compliance data available
            </p>
            <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
              {selectedHomeId === 'all'
                ? 'Compliance data for all homes will appear here'
                : 'Compliance data for this home will appear here'}
            </p>
          </div>

          {/* Placeholder example cards to show expected UI */}
          <div className='mt-4 space-y-3'>
            <p className='text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide'>
              Example Layout
            </p>

            {/* Example: Green (90%+) */}
            <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden opacity-60'>
              <div className='px-4 py-3 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <CheckCircle2 size={16} className='text-emerald-500' />
                  <div>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                      Sunshine House
                    </p>
                    <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                      8 of 8 logs complete
                    </p>
                  </div>
                </div>
                <span className={cn('text-sm font-bold', 'text-emerald-600 dark:text-emerald-400')}>
                  100%
                </span>
              </div>
              <div className='h-1.5 bg-zinc-100 dark:bg-zinc-800'>
                <div className='h-full bg-emerald-500 rounded-full' style={{ width: '100%' }} />
              </div>
            </div>

            {/* Example: Yellow (70-89%) */}
            <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden opacity-60'>
              <div className='px-4 py-3 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <AlertCircle size={16} className='text-amber-500' />
                  <div>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                      Maple Grove
                    </p>
                    <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                      6 of 8 logs complete
                    </p>
                  </div>
                </div>
                <span className={cn('text-sm font-bold', 'text-amber-600 dark:text-amber-400')}>
                  75%
                </span>
              </div>
              <div className='h-1.5 bg-zinc-100 dark:bg-zinc-800'>
                <div className='h-full bg-amber-500 rounded-full' style={{ width: '75%' }} />
              </div>
            </div>

            {/* Example: Red (<70%) */}
            <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden opacity-60'>
              <div className='px-4 py-3 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <AlertCircle size={16} className='text-red-500' />
                  <div>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                      Oak Haven
                    </p>
                    <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                      3 of 6 logs complete
                    </p>
                  </div>
                </div>
                <span className={cn('text-sm font-bold', 'text-red-600 dark:text-red-400')}>
                  50%
                </span>
              </div>
              <div className='h-1.5 bg-zinc-100 dark:bg-zinc-800'>
                <div className='h-full bg-red-500 rounded-full' style={{ width: '50%' }} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='px-4 space-y-3'>
          {complianceData.map(home => {
            const colors = getComplianceColor(home.percentage)
            return (
              <div
                key={home.homeId}
                className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden'
              >
                <div className='px-4 py-3 flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    {getStatusIcon(home.percentage)}
                    <div>
                      <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                        {home.homeName}
                      </p>
                      <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                        {home.completedLogs} of {home.totalResidents} logs complete
                      </p>
                    </div>
                  </div>
                  <span className={cn('text-sm font-bold', colors.text)}>
                    {home.percentage}%
                  </span>
                </div>
                <div className='h-1.5 bg-zinc-100 dark:bg-zinc-800'>
                  <div
                    className={cn('h-full rounded-full transition-all', colors.bar)}
                    style={{ width: `${home.percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
