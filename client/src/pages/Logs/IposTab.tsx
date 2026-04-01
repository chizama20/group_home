import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getHomeIpos, createIposLog } from '../../api/logs'
import type { IposLog, Shift } from '../../types/log'
import type { Resident } from '../../types/resident'
import { currentShift, SHIFT_LABELS } from '../../types/log'
import { todayStr } from '../../utils/date'
import { cn } from '../../lib/cn'
import { useRole } from '../../utils/role'
import IposCompliancePanel from './IposCompliancePanel'
import { Skeleton } from '../../components/ui/skeleton'
import { Sheet, SheetContent } from '../../components/ui/sheet'

const SHIFTS: Shift[] = ['day', 'evening', 'night']

const MOODS = [
  { value: 'Good',       classes: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'Neutral',    classes: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'Low',        classes: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'Distressed', classes: 'bg-red-100 text-red-700 border-red-300' },
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
}

function IposEmployeeView({ homeId, residents }: EmployeeProps) {
  const [shift, setShift]     = useState<Shift>(currentShift())
  const [iposLogs, setIposLogs] = useState<IposLog[]>([])
  const [loading, setLoading] = useState(false)

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
      .catch(() => toast.error('Failed to load IPOS logs'))
      .finally(() => setLoading(false))
  }, [homeId, shift])

  useEffect(() => { loadLogs() }, [loadLogs])

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
      {/* Shift tabs */}
      <div className='flex border-b border-border bg-card'>
        {SHIFTS.map(s => (
          <button
            key={s}
            onClick={() => { setShift(s); setSuccessId(null) }}
            className={cn(
              'flex-1 py-3 text-sm font-medium capitalize min-h-[44px]',
              shift === s
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className='px-3 py-2 bg-muted border-b border-border'>
        <p className='text-xs text-muted-foreground'>{SHIFT_LABELS[shift]} · Today</p>
      </div>

      {loading && (
        <div className='bg-card divide-y divide-muted'>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className='flex items-center gap-3 px-4 py-3'>
              <Skeleton className='w-9 h-9 rounded-full shrink-0' />
              <Skeleton className='h-4 flex-1' />
              <Skeleton className='w-16 h-6 rounded-full' />
            </div>
          ))}
        </div>
      )}

      <div className={cn('bg-card divide-y divide-muted', loading && 'hidden')}>
        {active.map(r => {
          const filed   = filedIds.has(r.id)
          const justDone = successId === r.id
          return (
            <button
              key={r.id}
              disabled={filed}
              onClick={() => !filed && openForm(r)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left',
                !filed && 'hover:bg-muted active:bg-muted'
              )}
            >
              <div className='w-9 h-9 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0'>
                {r.first_name[0]}{r.last_name[0]}
              </div>
              <p className='flex-1 text-sm font-medium text-foreground'>
                {r.first_name} {r.last_name}
              </p>
              {filed || justDone ? (
                <span className='text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full'>
                  Filed
                </span>
              ) : (
                <span className='text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full'>
                  Pending
                </span>
              )}
            </button>
          )
        })}
        {!loading && active.length === 0 && (
          <p className='p-4 text-sm text-muted-foreground'>No active residents</p>
        )}
      </div>

      {/* IPOS Form Modal */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) closeForm() }}>
        <SheetContent side='bottom' className='max-h-[90vh] overflow-y-auto rounded-t-2xl px-4 pt-3 pb-8'>
          <div className='w-12 h-1 bg-muted rounded-full mx-auto mt-3' />
          <div className='flex items-center justify-between mb-4'>
            <div>
              <p className='text-xs text-muted-foreground uppercase tracking-wide font-semibold'>IPOS Log</p>
              <p className='font-semibold text-foreground mt-0.5'>
                {selected?.first_name} {selected?.last_name}
              </p>
              <p className='text-xs text-muted-foreground capitalize mt-0.5'>{shift} shift · Today</p>
            </div>
            <button onClick={closeForm} className='text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center text-xl'>✕</button>
          </div>

          <p className='text-sm font-medium text-foreground mb-2'>
            Mood <span className='text-red-500'>*</span>
          </p>
          <div className='grid grid-cols-2 gap-2 mb-4'>
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={cn(
                  'py-2.5 rounded-xl text-sm font-semibold border min-h-[44px] transition-all',
                  mood === m.value
                    ? m.classes + ' ring-2 ring-offset-1 ring-primary/40'
                    : 'bg-muted text-muted-foreground border-border'
                )}
              >
                {m.value}
              </button>
            ))}
          </div>

          <label className='block text-sm font-medium text-foreground mb-1'>Observations</label>
          <textarea
            value={observations}
            onChange={e => setObservations(e.target.value)}
            placeholder='How is the resident today?'
            rows={3}
            className='w-full border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4'
          />

          <label className='block text-sm font-medium text-foreground mb-1'>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder='Any additional notes…'
            rows={2}
            className='w-full border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4'
          />

          {formError && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3'>{formError}</p>
          )}

          <button
            onClick={() => { void handleSubmit() }}
            disabled={!mood || submitting}
            className='w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'
          >
            {submitting ? 'Submitting…' : 'Submit log'}
          </button>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  homeId:    string
  residents: Resident[]
}

export default function IposTab({ homeId, residents }: Props) {
  const { isManagerOrAbove } = useRole()

  if (isManagerOrAbove) {
    return <IposCompliancePanel homeId={homeId} />
  }

  return <IposEmployeeView homeId={homeId} residents={residents} />
}
