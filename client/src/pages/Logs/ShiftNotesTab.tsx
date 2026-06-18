import { useState, useEffect, type FormEvent } from 'react'
import { Flag } from 'lucide-react'
import { getShiftNotes, createShiftNote } from '../../api/logs'
import type { ShiftNote, Shift } from '../../types/log'
import type { Resident } from '../../types/resident'
import { currentShift } from '../../types/log'
import { cn } from '../../lib/cn'
import { formatDate, todayStr } from '../../utils/date'

const SHIFT_CHIPS: { value: Shift | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'am',  label: 'AM' },
  { value: 'pm',  label: 'PM' },
  { value: 'mn',  label: 'MN' },
]

interface Props {
  homeId:    string
  residents: Resident[]
}

export default function ShiftNotesTab({ homeId, residents }: Props) {
  const active = residents.filter(r => r.is_active)

  // Form state
  const [content,    setContent]    = useState('')
  const [residentId, setResidentId] = useState('')
  const [flagged,    setFlagged]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)
  const [submitted,  setSubmitted]  = useState(false)

  // Feed state
  const [notes,      setNotes]      = useState<ShiftNote[]>([])
  const [feedLoading,setFeedLoading]= useState(true)
  const [shiftFilter,setShiftFilter]= useState<Shift | 'all'>('all')

  const shift      = currentShift()
  const shiftDate  = todayStr()

  function loadFeed() {
    setFeedLoading(true)
    const params = shiftFilter === 'all'
      ? { date: shiftDate }
      : { shift: shiftFilter, date: shiftDate }
    getShiftNotes(homeId, params)
      .then(res => setNotes(res.data.data ?? []))
      .catch(() => {/* non-critical */})
      .finally(() => setFeedLoading(false))
  }

  useEffect(() => { loadFeed() }, [homeId, shiftFilter])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setFormError(null)
    setSubmitted(false)
    try {
      await createShiftNote(homeId, {
        resident_id: residentId || null,
        shift,
        shift_date: shiftDate,
        content:    content.trim(),
        flagged,
      })
      setContent('')
      setResidentId('')
      setFlagged(false)
      setSubmitted(true)
      loadFeed()
    } catch {
      setFormError('Failed to submit note')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <div>
      {/* Compose form */}
      <div className='bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 space-y-3'>
        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
          New Shift Note · <span className='normal-case'>{shift.toUpperCase()} shift</span>
        </p>

        {submitted && (
          <div className='bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5'>
            <p className='text-sm font-medium text-primary'>Note posted.</p>
          </div>
        )}

        <form onSubmit={e => { void handleSubmit(e) }} className='space-y-3'>
          {/* Optional resident */}
          <select
            value={residentId}
            onChange={e => { setResidentId(e.target.value); setSubmitted(false) }}
            className={inputClass}
          >
            <option value=''>Regarding: All residents</option>
            {active.map(r => (
              <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
            ))}
          </select>

          {/* Note content */}
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); setSubmitted(false) }}
            placeholder='Write a shift note…'
            rows={4}
            required
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary'
          />

          {/* Flag toggle */}
          <button
            type='button'
            onClick={() => setFlagged(f => !f)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors min-h-[40px]',
              flagged
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
            )}
          >
            <Flag className='w-4 h-4' />
            {flagged ? 'Flagged for follow-up' : 'Flag for follow-up'}
          </button>

          {formError && (
            <div className='bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
              {formError}
            </div>
          )}

          <button
            type='submit'
            disabled={submitting || !content.trim()}
            className='w-full bg-primary text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
          >
            {submitting ? 'Posting…' : 'Post note'}
          </button>
        </form>
      </div>

      {/* Feed */}
      <div className='p-4 space-y-3'>
        {/* Shift filter chips */}
        <div className='flex gap-2 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
          {SHIFT_CHIPS.map(c => (
            <button
              key={c.value}
              onClick={() => setShiftFilter(c.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] border shrink-0',
                shiftFilter === c.value
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Skeletons */}
        {feedLoading && [0, 1, 2].map(i => (
          <div key={i} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2 animate-pulse'>
            <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3' />
            <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3' />
            <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2' />
          </div>
        ))}

        {!feedLoading && !notes.length && (
          <p className='text-center text-sm text-zinc-400 dark:text-zinc-600 py-6'>
            No shift notes for {shiftFilter === 'all' ? 'today' : `the ${shiftFilter.toUpperCase()} shift`}
          </p>
        )}

        {!feedLoading && notes.map(note => (
          <div
            key={note.id}
            className={cn(
              'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3',
              note.flagged && 'border-l-4 border-l-red-500'
            )}
          >
            <div className='flex items-center justify-between gap-2 mb-1'>
              <div className='flex items-center gap-2 min-w-0'>
                <p className='text-sm font-semibold text-zinc-900 dark:text-white truncate'>
                  {note.first_name} {note.last_name}
                </p>
                <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0'>
                  {note.shift.toUpperCase()}
                </span>
                {note.flagged && (
                  <span className='flex items-center gap-1 text-[10px] font-semibold text-red-400 shrink-0'>
                    <Flag className='w-3 h-3' /> Flagged
                  </span>
                )}
              </div>
              <span className='text-xs text-zinc-400 dark:text-zinc-500 shrink-0'>
                {formatDate(note.created_at)}
              </span>
            </div>

            {note.resident_first && (
              <p className='text-xs text-primary mb-1.5'>
                Re: {note.resident_first} {note.resident_last}
              </p>
            )}

            <p className='text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed'>
              {note.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
