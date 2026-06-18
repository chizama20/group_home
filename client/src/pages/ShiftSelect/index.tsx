import { useState } from 'react'
import { selectShift } from '../../api/auth'
import { useHome } from '../../context/HomeContext'
import type { Shift } from '../../types/log'
import { SHIFT_LABELS } from '../../types/log'
import { cn } from '../../lib/cn'
import { todayStr } from '../../utils/date'

interface Props {
  onComplete: () => void
}

const SHIFTS: Shift[] = ['am', 'pm', 'mn']

function greeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function ShiftSelect({ onComplete }: Props) {
  const { homeId } = useHome()
  const [selected, setSelected] = useState<Shift[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function toggle(shift: Shift) {
    setSelected(prev =>
      prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
    )
  }

  async function handleStart() {
    if (!homeId || selected.length === 0) return
    setLoading(true)
    setError(null)
    try {
      await selectShift(homeId, selected)
      localStorage.setItem(`shift_selected_${todayStr()}`, JSON.stringify(selected))
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select shift. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-zinc-950 flex items-center justify-center px-4'>
      <div className='bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm'>
        {/* Header */}
        <div className='mb-6'>
          <h1 className='text-xl font-bold text-white mb-1'>{greeting()}</h1>
          <p className='text-sm text-zinc-400'>Select your shift for today</p>
        </div>

        {/* Shift toggles */}
        <div className='flex flex-col gap-2.5 mb-6'>
          {SHIFTS.map(shift => {
            const isSelected = selected.includes(shift)
            return (
              <button
                key={shift}
                onClick={() => toggle(shift)}
                className={cn(
                  'w-full min-h-[52px] rounded-xl border text-sm font-semibold px-4 py-3 text-left transition-colors',
                  isSelected
                    ? 'bg-primary text-white border-primary'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 active:bg-zinc-700'
                )}
              >
                <span className='text-xs font-bold uppercase tracking-widest mr-2'>
                  {shift.toUpperCase()}
                </span>
                <span className='text-zinc-300 font-normal'>{SHIFT_LABELS[shift]}</span>
              </button>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div className='mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
            {error}
          </div>
        )}

        {/* Start button */}
        <button
          onClick={() => { void handleStart() }}
          disabled={selected.length === 0 || loading}
          className='bg-primary text-white rounded-xl py-3.5 w-full font-semibold min-h-[44px] disabled:opacity-40 transition-opacity'
        >
          {loading ? 'Starting…' : 'Start Shift'}
        </button>
      </div>
    </div>
  )
}
