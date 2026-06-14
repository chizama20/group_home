import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Home, X, CheckCircle, AlertCircle } from 'lucide-react'
import { getMySlots, createScheduleRequest } from '@/api/schedule'
import type { ShiftSlot, ShiftType } from '@/types/schedule'
import { Skeleton } from '@/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const SHIFT_LABEL: Record<ShiftType, string> = {
  day: 'Day',
  evening: 'Evening',
  night: 'Night',
}

const SHIFT_BADGE: Record<ShiftType, string> = {
  day: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  evening: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  night: 'bg-primary/10 text-primary border border-primary/20',
}

// ---------------------------------------------------------------------------
// Toast (inline, ephemeral)
// ---------------------------------------------------------------------------

interface ToastState {
  kind: 'success' | 'error'
  message: string
}

function InlineToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const isSuccess = toast.kind === 'success'
  return (
    <div
      className={[
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border max-w-sm w-[calc(100vw-2rem)]',
        isSuccess
          ? 'bg-emerald-900/90 border-emerald-700/60 text-emerald-200'
          : 'bg-red-900/90 border-red-700/60 text-red-200',
      ].join(' ')}
    >
      {isSuccess ? (
        <CheckCircle className='h-4 w-4 shrink-0 text-emerald-400' />
      ) : (
        <AlertCircle className='h-4 w-4 shrink-0 text-red-400' />
      )}
      <span className='text-sm flex-1'>{toast.message}</span>
      <button onClick={onDismiss} className='shrink-0 opacity-70 hover:opacity-100'>
        <X className='h-4 w-4' />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shift card
// ---------------------------------------------------------------------------

interface ShiftCardProps {
  slot: ShiftSlot
  onRequestOff: (slot: ShiftSlot) => void
  pending: boolean
}

function ShiftCard({ slot, onRequestOff, pending }: ShiftCardProps) {
  return (
    <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3'>
      {/* Date row */}
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-2 text-zinc-900 dark:text-white'>
          <Calendar className='h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500' />
          <span className='text-sm font-medium'>{formatDate(slot.date)}</span>
        </div>
        <span
          className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${SHIFT_BADGE[slot.shift_type]}`}
        >
          {SHIFT_LABEL[slot.shift_type]}
        </span>
      </div>

      {/* Home row */}
      <div className='flex items-center gap-2 text-zinc-500 dark:text-zinc-400'>
        <Home className='h-3.5 w-3.5 shrink-0' />
        <span className='text-sm'>{slot.home_name}</span>
      </div>

      {/* Time row (if available) */}
      {(slot.start_time || slot.end_time) && (
        <div className='flex items-center gap-2 text-zinc-500 dark:text-zinc-400'>
          <Clock className='h-3.5 w-3.5 shrink-0' />
          <span className='text-sm'>
            {slot.start_time && slot.end_time
              ? `${slot.start_time} – ${slot.end_time}`
              : slot.start_time ?? slot.end_time}
          </span>
        </div>
      )}

      {/* CTA */}
      {pending ? (
        <div className='mt-1 text-center text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg py-2'>
          Request Pending
        </div>
      ) : (
        <button
          type='button'
          onClick={() => onRequestOff(slot)}
          className='mt-1 w-full py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors min-h-[40px]'
        >
          Request time off
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton cards
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3'>
      <Skeleton className='h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800' />
      <Skeleton className='h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800' />
      <Skeleton className='h-9 w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg' />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Time-off request modal (bottom sheet)
// ---------------------------------------------------------------------------

interface RequestModalProps {
  slot: ShiftSlot
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}

function RequestModal({ slot, onClose, onSubmit }: RequestModalProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit(reason.trim())
    setSubmitting(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onClose} />

      {/* Sheet */}
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 pb-safe max-h-[85vh] overflow-y-auto'>
        {/* Drag handle */}
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />

        <div className='px-4 pt-4 pb-8'>
          {/* Header */}
          <div className='flex items-center justify-between mb-5'>
            <h2 className='text-base font-bold text-zinc-900 dark:text-white'>Request Time Off</h2>
            <button
              onClick={onClose}
              className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
            >
              <X className='w-5 h-5 text-zinc-500 dark:text-zinc-400' />
            </button>
          </div>

          {/* Shift details (read-only) */}
          <div className='bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 mb-5 space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-zinc-500 dark:text-zinc-400'>Date</span>
              <span className='text-sm font-medium text-zinc-900 dark:text-white'>
                {formatDate(slot.date)}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-zinc-500 dark:text-zinc-400'>Shift</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SHIFT_BADGE[slot.shift_type]}`}
              >
                {SHIFT_LABEL[slot.shift_type]}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-zinc-500 dark:text-zinc-400'>Home</span>
              <span className='text-sm font-medium text-zinc-900 dark:text-white'>
                {slot.home_name}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
                Reason <span className='font-normal text-zinc-400'>(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder='e.g. Medical appointment, family emergency...'
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none'
              />
            </div>

            <div className='flex gap-3'>
              <button
                type='button'
                onClick={onClose}
                className='flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 min-h-[44px] transition-colors'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={submitting}
                className='flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-primary/90 disabled:opacity-50 transition-colors'
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MySchedulePage() {
  const navigate = useNavigate()
  const [slots, setSlots] = useState<ShiftSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [selectedSlot, setSelectedSlot] = useState<ShiftSlot | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMySlots()
      .then(res => {
        if (cancelled) return
        if (res.data.success && res.data.data) {
          setSlots(res.data.data)
        }
      })
      .catch(() => {
        // Silently fail — slots just stay empty
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  function showToast(kind: ToastState['kind'], message: string) {
    setToast({ kind, message })
  }

  async function handleSubmitRequest(reason: string) {
    if (!selectedSlot) return
    try {
      const res = await createScheduleRequest(selectedSlot.home_id, {
        slot_id: selectedSlot.id,
        date: selectedSlot.date,
        shift_type: selectedSlot.shift_type,
        reason: reason || undefined,
      })
      if (res.data.success) {
        setPendingIds(prev => new Set(prev).add(selectedSlot.id))
        setSelectedSlot(null)
        showToast('success', 'Request submitted — your manager will be notified')
      } else {
        setSelectedSlot(null)
        showToast('error', res.data.error?.message ?? 'Failed to submit request')
      }
    } catch {
      setSelectedSlot(null)
      showToast('error', 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-10'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='flex items-center gap-3 px-4 pt-5 pb-4'>
          <button
            type='button'
            onClick={() => navigate('/settings')}
            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors'
            aria-label='Back to Settings'
          >
            <ArrowLeft className='h-5 w-5 text-zinc-700 dark:text-zinc-300' />
          </button>
          <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>My Schedule</h1>
        </div>

        {/* Upcoming Shifts */}
        <div className='px-4'>
          <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3'>
            Upcoming Shifts
          </p>

          {loading ? (
            <div className='space-y-3'>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : slots.length === 0 ? (
            <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-8 text-center'>
              <Calendar className='h-8 w-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-600' />
              <p className='text-sm text-zinc-500 dark:text-zinc-400'>No upcoming shifts scheduled</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {slots.map(slot => (
                <ShiftCard
                  key={slot.id}
                  slot={slot}
                  pending={pendingIds.has(slot.id)}
                  onRequestOff={setSelectedSlot}
                />
              ))}
            </div>
          )}
        </div>

        {/* TODO: show past requests */}
      </div>

      {/* Request time-off modal */}
      {selectedSlot && (
        <RequestModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSubmit={handleSubmitRequest}
        />
      )}

      {/* Ephemeral toast */}
      {toast && (
        <InlineToast toast={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
