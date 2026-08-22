import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calendar, Home, X, CheckCircle, AlertCircle, Phone, Sun, Sunset, Moon } from 'lucide-react'
import { getMySlots, createScheduleRequest, getLiveRoster, getShiftTrades, createShiftTrade, claimShiftTrade, cancelShiftTrade } from '../../api/schedule'
import { useHome } from '../../context/HomeContext'
import { cn } from '../../lib/cn'
import RecentChangesBell from '../../components/RecentChangesBell'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Skeleton } from '../../components/ui/skeleton'
import type { ShiftSlot, ShiftType, LiveRoster, ShiftTrade, TradeBoard } from '../../types/schedule'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
}

const SHIFT_LABEL: Record<ShiftType, string> = { day: 'Day', evening: 'Evening', night: 'Night' }
const SHIFT_BADGE: Record<ShiftType, string> = {
  day: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  evening: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  night: 'bg-primary/10 text-primary border border-primary/20',
}
const SHIFT_ICON: Record<ShiftType, React.ReactNode> = {
  day: <Sun className='h-3.5 w-3.5' />,
  evening: <Sunset className='h-3.5 w-3.5' />,
  night: <Moon className='h-3.5 w-3.5' />,
}

function getInitials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

// ── Toast ────────────────────────────────────────────────────────────────────

interface ToastState { kind: 'success' | 'error'; message: string }

function InlineToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const isSuccess = toast.kind === 'success'
  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border max-w-sm w-[calc(100vw-2rem)]',
      isSuccess ? 'bg-emerald-900/90 border-emerald-700/60 text-emerald-200' : 'bg-red-900/90 border-red-700/60 text-red-200'
    )}>
      {isSuccess ? <CheckCircle className='h-4 w-4 shrink-0 text-emerald-400' /> : <AlertCircle className='h-4 w-4 shrink-0 text-red-400' />}
      <span className='text-sm flex-1'>{toast.message}</span>
      <button onClick={onDismiss} className='shrink-0 opacity-70 hover:opacity-100'><X className='h-4 w-4' /></button>
    </div>
  )
}

// ── My Shifts tab ────────────────────────────────────────────────────────────

function ShiftCard({ slot, onRequestOff, onOfferTrade, pending, offered }: {
  slot: ShiftSlot
  onRequestOff: (slot: ShiftSlot) => void
  onOfferTrade: (slot: ShiftSlot) => void
  pending: boolean
  offered: boolean
}) {
  return (
    <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3'>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-2 text-zinc-900 dark:text-white'>
          <Calendar className='h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500' />
          <span className='text-sm font-medium'>{formatDate(slot.date)}</span>
        </div>
        <span className={cn('shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full', SHIFT_BADGE[slot.shift_type])}>
          {SHIFT_LABEL[slot.shift_type]}
        </span>
      </div>
      <div className='flex items-center gap-2 text-zinc-500 dark:text-zinc-400'>
        <Home className='h-3.5 w-3.5 shrink-0' />
        <span className='text-sm'>{slot.home_name}</span>
      </div>
      <div className='flex gap-2'>
        {pending ? (
          <div className='flex-1 text-center text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg py-2'>
            Time Off Pending
          </div>
        ) : (
          <button type='button' onClick={() => onRequestOff(slot)}
            className='flex-1 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors min-h-[40px]'>
            Request time off
          </button>
        )}
        {offered ? (
          <div className='flex-1 text-center text-xs font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 flex items-center justify-center'>
            Offered for trade
          </div>
        ) : (
          <button type='button' onClick={() => onOfferTrade(slot)}
            className='flex-1 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors min-h-[40px]'>
            Offer trade
          </button>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3'>
      <Skeleton className='h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800' />
      <Skeleton className='h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800' />
      <Skeleton className='h-9 w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg' />
    </div>
  )
}

function RequestOffModal({ slot, onClose, onSubmit }: {
  slot: ShiftSlot
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}) {
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
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onClose} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 max-h-[85vh] overflow-y-auto'>
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />
        <div className='px-4 pt-4 pb-8'>
          <div className='flex items-center justify-between mb-5'>
            <h2 className='text-base font-bold text-zinc-900 dark:text-white'>Request Time Off</h2>
            <button onClick={onClose} className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'>
              <X className='w-5 h-5 text-zinc-500 dark:text-zinc-400' />
            </button>
          </div>
          <div className='bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 mb-5 space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-zinc-500 dark:text-zinc-400'>Date</span>
              <span className='text-sm font-medium text-zinc-900 dark:text-white'>{formatDate(slot.date)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-zinc-500 dark:text-zinc-400'>Shift</span>
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', SHIFT_BADGE[slot.shift_type])}>
                {SHIFT_LABEL[slot.shift_type]}
              </span>
            </div>
          </div>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
                Reason <span className='font-normal text-zinc-400'>(optional)</span>
              </label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                placeholder='e.g. Medical appointment, family emergency...'
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none' />
            </div>
            <div className='flex gap-3'>
              <button type='button' onClick={onClose}
                className='flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 min-h-[44px] transition-colors'>
                Cancel
              </button>
              <button type='submit' disabled={submitting}
                className='flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-primary/90 disabled:opacity-50 transition-colors'>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

function OfferTradeModal({ slot, onClose, onSubmit }: {
  slot: ShiftSlot
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}) {
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
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onClose} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 max-h-[85vh] overflow-y-auto'>
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />
        <div className='px-4 pt-4 pb-8'>
          <div className='flex items-center justify-between mb-5'>
            <h2 className='text-base font-bold text-zinc-900 dark:text-white'>Offer Shift for Trade</h2>
            <button onClick={onClose} className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'>
              <X className='w-5 h-5 text-zinc-500 dark:text-zinc-400' />
            </button>
          </div>
          <div className='bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 mb-5 space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-zinc-500 dark:text-zinc-400'>Date</span>
              <span className='text-sm font-medium text-zinc-900 dark:text-white'>{formatDate(slot.date)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-zinc-500 dark:text-zinc-400'>Shift</span>
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', SHIFT_BADGE[slot.shift_type])}>
                {SHIFT_LABEL[slot.shift_type]}
              </span>
            </div>
          </div>
          <p className='text-xs text-zinc-500 dark:text-zinc-400 mb-4'>
            Any staff member at this home will be able to claim this shift. It's assigned automatically to whoever claims it first — no approval needed.
          </p>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
                Note <span className='font-normal text-zinc-400'>(optional)</span>
              </label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                placeholder='e.g. Can trade for any evening shift this week'
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none' />
            </div>
            <div className='flex gap-3'>
              <button type='button' onClick={onClose}
                className='flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 min-h-[44px] transition-colors'>
                Cancel
              </button>
              <button type='submit' disabled={submitting}
                className='flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-primary/90 disabled:opacity-50 transition-colors'>
                {submitting ? 'Offering...' : 'Offer Shift'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

function MyShiftsTab({ homeId, onToast }: { homeId: string | null; onToast: (t: ToastState) => void }) {
  const [slots, setSlots] = useState<ShiftSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [offeredIds, setOfferedIds] = useState<Set<string>>(new Set())
  const [requestSlot, setRequestSlot] = useState<ShiftSlot | null>(null)
  const [tradeSlot, setTradeSlot] = useState<ShiftSlot | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getMySlots()
      .then(res => { if (res.data.success && res.data.data) setSlots(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmitRequest(reason: string) {
    if (!requestSlot) return
    try {
      const res = await createScheduleRequest(requestSlot.home_id, {
        slot_id: requestSlot.id, date: requestSlot.date, shift_type: requestSlot.shift_type, reason: reason || undefined,
      })
      if (res.data.success) {
        setPendingIds(prev => new Set(prev).add(requestSlot.id))
        setRequestSlot(null)
        onToast({ kind: 'success', message: 'Request submitted — your manager will be notified' })
      } else {
        setRequestSlot(null)
        onToast({ kind: 'error', message: res.data.error?.message ?? 'Failed to submit request' })
      }
    } catch {
      setRequestSlot(null)
      onToast({ kind: 'error', message: 'Something went wrong. Please try again.' })
    }
  }

  async function handleOfferTrade(reason: string) {
    if (!tradeSlot) return
    try {
      const res = await createShiftTrade(tradeSlot.home_id, { slot_id: tradeSlot.id, reason: reason || undefined })
      if (res.data.success) {
        setOfferedIds(prev => new Set(prev).add(tradeSlot.id))
        setTradeSlot(null)
        onToast({ kind: 'success', message: 'Shift offered — other staff can now claim it' })
      } else {
        setTradeSlot(null)
        onToast({ kind: 'error', message: res.data.error?.message ?? 'Failed to offer shift' })
      }
    } catch {
      setTradeSlot(null)
      onToast({ kind: 'error', message: 'Something went wrong. Please try again.' })
    }
  }

  const homeSlots = homeId ? slots.filter(s => s.home_id === homeId) : slots

  return (
    <div className='px-4 pt-4'>
      {loading ? (
        <div className='space-y-3'>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : homeSlots.length === 0 ? (
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-8 text-center'>
          <Calendar className='h-8 w-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-600' />
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No upcoming shifts scheduled</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {homeSlots.map(slot => (
            <ShiftCard
              key={slot.id}
              slot={slot}
              pending={pendingIds.has(slot.id)}
              offered={offeredIds.has(slot.id)}
              onRequestOff={setRequestSlot}
              onOfferTrade={setTradeSlot}
            />
          ))}
        </div>
      )}

      {requestSlot && (
        <RequestOffModal slot={requestSlot} onClose={() => setRequestSlot(null)} onSubmit={handleSubmitRequest} />
      )}
      {tradeSlot && (
        <OfferTradeModal slot={tradeSlot} onClose={() => setTradeSlot(null)} onSubmit={handleOfferTrade} />
      )}
    </div>
  )
}

// ── Roster tab ("who's on now/later") ───────────────────────────────────────

function PersonRow({ first, last, phone, shiftLabel, sub }: {
  first: string; last: string; phone: string | null; shiftLabel: React.ReactNode; sub: string
}) {
  return (
    <div className='flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0'>
      <div className='w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0'>
        {getInitials(first, last)}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium text-zinc-900 dark:text-white'>{first} {last}</p>
        <p className='text-xs text-zinc-500 dark:text-zinc-400'>{sub}</p>
      </div>
      {shiftLabel}
      {phone && (
        <a href={`tel:${phone}`} className='w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0'>
          <Phone className='w-3.5 h-3.5' />
        </a>
      )}
    </div>
  )
}

function RosterTab({ homeId }: { homeId: string | null }) {
  const [roster, setRoster] = useState<LiveRoster | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!homeId) { setLoading(false); return }
    setLoading(true)
    getLiveRoster(homeId)
      .then(res => { if (res.data.success && res.data.data) setRoster(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [homeId])

  if (!homeId) {
    return (
      <div className='px-4 pt-4'>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center'>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>Select a home to view its roster.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='px-4 pt-4 space-y-4'>
      <div>
        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2'>
          On Now
        </p>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'>
          {loading ? (
            <div className='px-4 py-6 text-center text-sm text-zinc-400'>Loading…</div>
          ) : !roster?.onNow.length ? (
            <div className='px-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500'>No one clocked in right now.</div>
          ) : (
            roster.onNow.map(p => (
              <PersonRow key={p.user_id} first={p.first_name} last={p.last_name} phone={p.phone}
                sub={`Clocked in ${new Date(p.clocked_in_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                shiftLabel={<span className={cn('shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full mr-1', SHIFT_BADGE[p.shift])}>{SHIFT_LABEL[p.shift]}</span>} />
            ))
          )}
        </div>
      </div>

      <div>
        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2'>
          On Later Today
        </p>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'>
          {loading ? (
            <div className='px-4 py-6 text-center text-sm text-zinc-400'>Loading…</div>
          ) : !roster?.onLater.length ? (
            <div className='px-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500'>Nothing else scheduled today.</div>
          ) : (
            roster.onLater.map(p => (
              <PersonRow key={p.slot_id} first={p.first_name} last={p.last_name} phone={p.phone}
                sub='Scheduled'
                shiftLabel={<span className={cn('shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full mr-1', SHIFT_BADGE[p.shift_type])}>{SHIFT_LABEL[p.shift_type]}</span>} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Trade Board tab ──────────────────────────────────────────────────────────

function TradeCard({ trade, action }: { trade: ShiftTrade; action?: React.ReactNode }) {
  const dateLabel = new Date(trade.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return (
    <div className='flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5'>
      <div className='w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0'>
        {getInitials(trade.requester_first, trade.requester_last)}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{trade.requester_first} {trade.requester_last}</p>
        <p className='text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1'>
          {SHIFT_ICON[trade.shift_type]} {dateLabel} · {SHIFT_LABEL[trade.shift_type]}
        </p>
        {trade.reason && <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-0.5'>{trade.reason}</p>}
      </div>
      {action}
    </div>
  )
}

const TRADE_STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-500/10 text-amber-500',
  approved:  'bg-emerald-500/10 text-emerald-500',
  denied:    'bg-red-500/10 text-red-500',
  cancelled: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500',
}

function TradeBoardTab({ homeId, onToast }: { homeId: string | null; onToast: (t: ToastState) => void }) {
  const [board, setBoard] = useState<TradeBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ShiftTrade | null>(null)

  const load = useCallback(() => {
    if (!homeId) { setLoading(false); return }
    setLoading(true)
    getShiftTrades(homeId)
      .then(res => { if (res.data.success && res.data.data) setBoard(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [homeId])

  useEffect(() => { load() }, [load])

  async function handleClaim(trade: ShiftTrade) {
    if (!homeId) return
    setClaiming(trade.id)
    try {
      const res = await claimShiftTrade(homeId, trade.id)
      if (res.data.success) {
        onToast({ kind: 'success', message: 'Shift claimed — it now belongs to you' })
        load()
      } else {
        onToast({ kind: 'error', message: res.data.error?.message ?? 'Failed to claim shift' })
      }
    } catch {
      onToast({ kind: 'error', message: 'This shift may have just been claimed by someone else.' })
      load()
    } finally {
      setClaiming(null)
    }
  }

  async function handleCancel() {
    if (!homeId || !cancelTarget) return
    try {
      await cancelShiftTrade(homeId, cancelTarget.id)
      onToast({ kind: 'success', message: 'Trade offer cancelled' })
    } catch {
      onToast({ kind: 'error', message: 'Failed to cancel offer' })
    } finally {
      setCancelTarget(null)
      load()
    }
  }

  if (!homeId) {
    return (
      <div className='px-4 pt-4'>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center'>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>Select a home to view the trade board.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='px-4 pt-4 space-y-4'>
      <div>
        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2'>
          Open Shifts
        </p>
        {loading ? (
          <div className='space-y-2'><SkeletonCard /></div>
        ) : !board?.open.length ? (
          <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 text-center text-sm text-zinc-400 dark:text-zinc-500'>
            No open shift offers right now.
          </div>
        ) : (
          <div className='space-y-2'>
            {board.open.map(trade => (
              <TradeCard key={trade.id} trade={trade} action={
                <button
                  disabled={claiming === trade.id}
                  onClick={() => { void handleClaim(trade) }}
                  className='text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0'
                >
                  {claiming === trade.id ? 'Claiming…' : 'Claim'}
                </button>
              } />
            ))}
          </div>
        )}
      </div>

      <div>
        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2'>
          My Offers
        </p>
        {loading ? null : !board?.mine.length ? (
          <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 text-center text-sm text-zinc-400 dark:text-zinc-500'>
            You haven't offered any shifts. Offer one from the "My Shifts" tab.
          </div>
        ) : (
          <div className='space-y-2'>
            {board.mine.map(trade => (
              <TradeCard key={trade.id} trade={trade} action={
                <div className='flex items-center gap-2 shrink-0'>
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize', TRADE_STATUS_BADGE[trade.status])}>
                    {trade.status}
                  </span>
                  {trade.status === 'pending' && (
                    <button
                      onClick={() => setCancelTarget(trade)}
                      className='text-xs font-semibold px-2.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-colors'
                    >
                      Cancel
                    </button>
                  )}
                </div>
              } />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        title='Cancel this trade offer?'
        description='Staff will no longer be able to claim this shift.'
        confirmLabel='Cancel Offer'
        confirmVariant='destructive'
        onConfirm={() => { void handleCancel() }}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

type PageTab = 'my-shifts' | 'roster' | 'trades'

const TABS: { id: PageTab; label: string }[] = [
  { id: 'my-shifts', label: 'My Shifts' },
  { id: 'roster',    label: 'Roster' },
  { id: 'trades',    label: 'Trade Board' },
]

export default function SchedulePage() {
  const { homeId } = useHome()
  const [searchParams, setSearchParams] = useSearchParams()
  const [toast, setToast] = useState<ToastState | null>(null)

  const initialTab = (searchParams.get('tab') as PageTab | null) ?? 'my-shifts'
  const [tab, setTab] = useState<PageTab>(TABS.some(t => t.id === initialTab) ? initialTab : 'my-shifts')

  function handleTabChange(newTab: PageTab) {
    setTab(newTab)
    setSearchParams({ tab: newTab })
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-10'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex items-center justify-between px-4 pt-5 pb-3'>
          <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Schedule</h1>
          <RecentChangesBell />
        </div>

        <div className='flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4'>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px]',
                tab === t.id ? 'border-primary text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'my-shifts' && <MyShiftsTab homeId={homeId} onToast={setToast} />}
        {tab === 'roster' && <RosterTab homeId={homeId} />}
        {tab === 'trades' && <TradeBoardTab homeId={homeId} onToast={setToast} />}
      </div>

      {toast && <InlineToast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
