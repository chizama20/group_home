import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { getHomeIpos, createIposLog } from '../../api/logs'
import type { IposLog, Shift } from '../../types/log'
import type { Resident } from '../../types/resident'
import { currentShift, SHIFT_LABELS } from '../../types/log'
import { todayStr } from '../../utils/date'
import { cn } from '../../lib/cn'
import { useRole } from '../../utils/role'
import IposCompliancePanel from './IposCompliancePanel'

const SHIFTS: Shift[] = ['day', 'evening', 'night']

const MOODS = [
  { value: 'Good',       selectedClasses: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { value: 'Neutral',    selectedClasses: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  { value: 'Low',        selectedClasses: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'Distressed', selectedClasses: 'bg-red-500/15 text-red-400 border-red-500/30' },
]

function encodeContent(mood: string, observations: string, notes: string): string {
  const parts = [`Mood: ${mood}`]
  if (observations.trim()) parts.push(`Observations:\n${observations.trim()}`)
  if (notes.trim())        parts.push(`Notes:\n${notes.trim()}`)
  return parts.join('\n\n')
}

// ── Employee form ─────────────────────────────────────────────────────────────

interface EmployeeProps {
  homeId:    string
  residents: Resident[]
  showFab:   boolean
  onFabHandled: () => void
}

function IposEmployeeView({ homeId, residents, showFab, onFabHandled }: EmployeeProps) {
  const [shift, setShift]       = useState<Shift>(currentShift())
  const [iposLogs, setIposLogs] = useState<IposLog[]>([])
  const [loading, setLoading]   = useState(false)

  const [selected, setSelected]         = useState<Resident | null>(null)
  const [mood, setMood]                 = useState<string | null>(null)
  const [observations, setObservations] = useState('')
  const [notes, setNotes]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [formError, setFormError]       = useState<string | null>(null)
  const [successId, setSuccessId]       = useState<string | null>(null)

  const loadLogs = useCallback(() => {
    setLoading(true)
    getHomeIpos(homeId, { date: todayStr(), shift })
      .then(res => setIposLogs(res.data.data ?? []))
      .catch(() => {/* non-critical */})
      .finally(() => setLoading(false))
  }, [homeId, shift])

  useEffect(() => { loadLogs() }, [loadLogs])

  // FAB: open the first pending resident's form
  useEffect(() => {
    if (!showFab) return
    const filedIds = new Set(iposLogs.map(l => l.resident_id))
    const active   = residents.filter(r => r.is_active)
    const first    = active.find(r => !filedIds.has(r.id))
    if (first) openForm(first)
    onFabHandled()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFab])

  const filedIds = new Set(iposLogs.map(l => l.resident_id))
  const active   = residents.filter(r => r.is_active)

  function openForm(r: Resident) {
    setSelected(r)
    setMood(null)
    setObservations('')
    setNotes('')
    setFormError(null)
  }

  function closeForm() { setSelected(null) }

  async function handleSubmit() {
    if (!mood || !selected) return
    setSubmitting(true)
    setFormError(null)
    try {
      await createIposLog(homeId, {
        resident_id: selected.id,
        shift,
        log_date: todayStr(),
        content: encodeContent(mood, observations, notes),
      })
      setSuccessId(selected.id)
      closeForm()
      loadLogs()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { code?: string } } } }
      if (e.response?.data?.error?.code === 'DUPLICATE') {
        setFormError('Already filed for this shift')
      } else {
        setFormError(err instanceof Error ? err.message : 'Failed to submit')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Shift selector */}
      <div className='flex gap-2 px-4 pt-4 pb-2'>
        {SHIFTS.map(s => (
          <button
            key={s}
            onClick={() => { setShift(s); setSuccessId(null) }}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-semibold border min-h-[36px] transition-colors capitalize',
              shift === s
                ? 'bg-indigo-950 dark:bg-indigo-950 border-indigo-600 text-indigo-300'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500'
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Shift label bar */}
      <div className='px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50'>
        <p className='text-xs text-zinc-400 dark:text-zinc-500'>{SHIFT_LABELS[shift]} · Today</p>
      </div>

      {/* Skeleton loading */}
      {loading && (
        <div className='pt-2'>
          {[0,1,2,3].map(i => (
            <div key={i} className='mx-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center gap-3 p-4 animate-pulse'>
              <div className='w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 shrink-0' />
              <div className='h-4 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded' />
              <div className='w-14 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800' />
            </div>
          ))}
        </div>
      )}

      {/* Resident list */}
      {!loading && (
        <div className='px-4 space-y-2 pt-2'>
          {active.map(r => {
            const filed    = filedIds.has(r.id)
            const justDone = successId === r.id
            const isDone   = filed || justDone
            return (
              <button
                key={r.id}
                disabled={isDone}
                onClick={() => !isDone && openForm(r)}
                className={cn(
                  'w-full flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 min-h-[56px] text-left',
                  isDone
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/50'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  isDone
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'bg-amber-500/15 text-amber-500'
                )}>
                  {r.first_name[0]}{r.last_name[0]}
                </div>
                <p className='flex-1 text-sm font-semibold text-zinc-900 dark:text-white'>
                  {r.first_name} {r.last_name}
                </p>
                {isDone ? (
                  <span className='bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full'>
                    Filed
                  </span>
                ) : (
                  <span className='bg-amber-500/10 text-amber-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full'>
                    Pending
                  </span>
                )}
              </button>
            )
          })}
          {active.length === 0 && (
            <p className='p-4 text-sm text-zinc-400 dark:text-zinc-600'>No active residents</p>
          )}
        </div>
      )}

      {/* IPOS Form bottom sheet */}
      {selected && (
        <>
          <div className='fixed inset-0 bg-black/60 z-40' onClick={closeForm} />
          <div className='fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto'>
            <div className='w-9 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-5' />

            <div className='px-4 mb-4 relative'>
              <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400'>IPOS Log</p>
              <p className='text-[17px] font-semibold text-zinc-900 dark:text-white mt-0.5'>
                {selected.first_name} {selected.last_name}
              </p>
              <p className='text-xs text-zinc-500 capitalize mt-0.5'>{shift} shift · Today</p>
              <button
                onClick={closeForm}
                className='absolute top-0 right-4 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400'
              >
                <X size={14} />
              </button>
            </div>

            <p className='px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2'>
              Mood <span className='text-red-500'>*</span>
            </p>
            <div className='grid grid-cols-2 gap-2 px-4 mb-4'>
              {MOODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={cn(
                    'py-3 rounded-xl text-sm font-semibold border min-h-[44px] transition-all',
                    mood === m.value
                      ? m.selectedClasses + ' ring-2 ring-offset-1 ring-indigo-400'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                  )}
                >
                  {m.value}
                </button>
              ))}
            </div>

            <div className='px-4 mb-4'>
              <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Observations</label>
              <textarea
                value={observations}
                onChange={e => setObservations(e.target.value)}
                placeholder='How is the resident today?'
                rows={3}
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-400'
              />
            </div>

            <div className='px-4 mb-4'>
              <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder='Any additional notes…'
                rows={2}
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-400'
              />
            </div>

            {formError && (
              <div className='mx-4 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
                {formError}
              </div>
            )}

            <div className='px-4 pb-8'>
              <button
                onClick={() => { void handleSubmit() }}
                disabled={!mood || submitting}
                className='w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
              >
                {submitting ? 'Submitting…' : 'Submit log'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  homeId:       string
  residents:    Resident[]
  showFab:      boolean
  onFabHandled: () => void
}

export default function IposTab({ homeId, residents, showFab, onFabHandled }: Props) {
  const { isManagerOrAbove } = useRole()

  if (isManagerOrAbove) {
    return <IposCompliancePanel homeId={homeId} />
  }

  return <IposEmployeeView homeId={homeId} residents={residents} showFab={showFab} onFabHandled={onFabHandled} />
}
