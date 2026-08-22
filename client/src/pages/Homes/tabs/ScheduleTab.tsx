import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Sun, Sunset, Moon, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { getHomeStaff, type HomeStaffMember } from '../../../api/homes'
import {
  getHomeSchedule,
  createShiftSlot,
  deleteShiftSlot,
  getScheduleRequests,
  reviewScheduleRequest,
} from '../../../api/schedule'
import type { ShiftSlot, ShiftType, ScheduleRequest } from '../../../types/schedule'

interface Props {
  homeId: string
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns the Monday of the week containing `date` as a YYYY-MM-DD string */
function getMondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateStr(d)
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** Returns an array of 7 date strings Mon–Sun */
function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

function todayStr(): string {
  return toDateStr(new Date())
}

function formatWeekRange(monday: string): string {
  const sun = addDays(monday, 6)
  const monDate = new Date(monday + 'T12:00:00')
  const sunDate = new Date(sun + 'T12:00:00')
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }
  return `${monDate.toLocaleDateString('en-GB', opts)} – ${sunDate.toLocaleDateString('en-GB', opts)}`
}

/** "Mon 16" */
function formatDayHeader(dateStr: string): { abbrev: string; num: string } {
  const d = new Date(dateStr + 'T12:00:00')
  return {
    abbrev: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    num: d.toLocaleDateString('en-GB', { day: 'numeric' }),
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

interface ShiftMeta {
  id: ShiftType
  label: string
  time: string
  icon: React.ReactNode
  color: { text: string; bg: string; border: string; dot: string }
}

const SHIFTS: ShiftMeta[] = [
  {
    id: 'day',
    label: 'Day',
    time: '07:00–14:59',
    icon: <Sun className='h-3.5 w-3.5' />,
    color: {
      text: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-900/40',
      dot: 'bg-amber-500',
    },
  },
  {
    id: 'evening',
    label: 'Evening',
    time: '15:00–22:59',
    icon: <Sunset className='h-3.5 w-3.5' />,
    color: {
      text: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'border-violet-200 dark:border-violet-900/40',
      dot: 'bg-violet-500',
    },
  },
  {
    id: 'night',
    label: 'Night',
    time: '23:00–06:59',
    icon: <Moon className='h-3.5 w-3.5' />,
    color: {
      text: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20 dark:border-primary/30',
      dot: 'bg-primary',
    },
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function canManage(role: string): boolean {
  return role === 'admin'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className='overflow-x-auto'>
      <div className='min-w-[640px]'>
        {/* Header row */}
        <div className='grid grid-cols-[100px_repeat(7,1fr)] gap-px bg-zinc-200 dark:bg-zinc-700 rounded-t-lg overflow-hidden'>
          <div className='bg-zinc-50 dark:bg-zinc-900 p-2' />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className='bg-zinc-50 dark:bg-zinc-900 p-2'>
              <div className='h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-12 mx-auto' />
            </div>
          ))}
        </div>
        {/* Shift rows */}
        {SHIFTS.map(shift => (
          <div
            key={shift.id}
            className='grid grid-cols-[100px_repeat(7,1fr)] gap-px bg-zinc-200 dark:bg-zinc-700'
          >
            <div className='bg-white dark:bg-zinc-900 p-3'>
              <div className='h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-14' />
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className='bg-white dark:bg-zinc-900 p-2 min-h-[72px]'>
                <div className='h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse w-20 mb-1.5' />
              </div>
            ))}
          </div>
        ))}
        <div className='h-px bg-zinc-200 dark:bg-zinc-700 rounded-b-lg' />
      </div>
    </div>
  )
}

interface AddSlotPopoverProps {
  staff: HomeStaffMember[]
  onAdd: (userId: string) => Promise<void>
  onClose: () => void
}

function AddSlotPopover({ staff, onAdd, onClose }: AddSlotPopoverProps) {
  const [selected, setSelected] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true)
    try {
      await onAdd(selected)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={ref}
      className='absolute z-20 top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3'
    >
      <p className='text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide'>
        Assign staff
      </p>
      {staff.length === 0 ? (
        <p className='text-xs text-zinc-400 dark:text-zinc-500 py-2'>No staff available</p>
      ) : (
        <>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className='w-full text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1.5 text-zinc-900 dark:text-white mb-2'
          >
            <option value=''>Select staff…</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className='w-full bg-primary text-white text-sm font-medium py-1.5 rounded-md disabled:opacity-50 transition-opacity'
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </>
      )}
    </div>
  )
}

interface SlotChipProps {
  slot: ShiftSlot
  canEdit: boolean
  onRemove: (slot: ShiftSlot) => void
}

function SlotChip({ slot, canEdit, onRemove }: SlotChipProps) {
  const [hovered, setHovered] = useState(false)
  const first = slot.first_name ?? ''
  const last = slot.last_name ?? ''

  return (
    <div
      className='relative flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full pl-1 pr-2 py-0.5 text-xs group'
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div className='w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold flex items-center justify-center shrink-0'>
        {getInitials(first, last)}
      </div>
      {/* Name */}
      <span className='text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap'>
        {first} {last.charAt(0)}.
      </span>
      {/* TODO: add green dot when clock-in data is available */}
      {/* {slot.clocked_in && !slot.clocked_out && (
        <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0' title='Clocked in' />
      )} */}
      {/* Remove button (manager only) */}
      {canEdit && hovered && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(slot) }}
          className='absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-300 dark:bg-zinc-600 hover:bg-red-500 hover:text-white text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-colors'
          title={`Remove ${first} from this shift`}
        >
          <X className='h-2.5 w-2.5' />
        </button>
      )}
    </div>
  )
}

interface GridCellProps {
  slots: ShiftSlot[]
  canEdit: boolean
  homeStaff: HomeStaffMember[]
  onAdd: (userId: string) => Promise<void>
  onRemove: (slot: ShiftSlot) => void
}

interface AddButtonProps {
  homeStaff: HomeStaffMember[]
  onAdd: (userId: string) => Promise<void>
}

function AddButton({ homeStaff, onAdd }: AddButtonProps) {
  const [showPopover, setShowPopover] = useState(false)

  return (
    <div className='relative'>
      <button
        onClick={() => setShowPopover(v => !v)}
        className='flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500 hover:border-primary hover:text-primary transition-colors'
        title='Add staff to this shift'
      >
        <Plus className='h-3 w-3' />
      </button>
      {showPopover && (
        <AddSlotPopover
          staff={homeStaff}
          onAdd={onAdd}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  )
}

function GridCell({ slots, canEdit, homeStaff, onAdd, onRemove }: GridCellProps) {
  return (
    <div className='bg-white dark:bg-zinc-900 p-2 min-h-[72px]'>
      <div className='flex flex-wrap gap-1 mb-1'>
        {slots.map(slot => (
          <SlotChip
            key={slot.id}
            slot={slot}
            canEdit={canEdit}
            onRemove={onRemove}
          />
        ))}
      </div>
      {canEdit && (
        <AddButton homeStaff={homeStaff} onAdd={onAdd} />
      )}
    </div>
  )
}

interface RequestCardProps {
  req: ScheduleRequest
  onApprove: () => Promise<void>
  onDeny: () => Promise<void>
}

function RequestCard({ req, onApprove, onDeny }: RequestCardProps) {
  const [busy, setBusy] = useState(false)
  const shift = SHIFTS.find(s => s.id === req.shift_type)
  const dateLabel = new Date(req.date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  async function handle(fn: () => Promise<void>) {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  return (
    <div className='flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3'>
      {/* Avatar */}
      <div className='w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0'>
        {getInitials(req.requester_first ?? '', req.requester_last ?? '')}
      </div>
      {/* Info */}
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
          {req.requester_first} {req.requester_last}
        </p>
        <p className='text-xs text-zinc-500 dark:text-zinc-400'>
          Requested off {dateLabel}
          {shift && (
            <span className={`ml-1 font-medium ${shift.color.text}`}>
              · {shift.label}
            </span>
          )}
          {req.reason && <span className='ml-1'>— {req.reason}</span>}
        </p>
      </div>
      {/* Actions */}
      <div className='flex gap-2'>
        <button
          onClick={() => handle(onApprove)}
          disabled={busy}
          className='text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors'
        >
          Approve
        </button>
        <button
          onClick={() => handle(onDeny)}
          disabled={busy}
          className='text-xs font-semibold px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50 transition-colors'
        >
          Deny
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScheduleTab({ homeId }: Props) {
  const { user } = useAuth()
  const isManager = canManage(user?.role ?? '')

  // Week navigation state
  const [monday, setMonday] = useState(() => getMondayOf(new Date()))

  // Data state
  const [scheduleData, setScheduleData] = useState<Record<string, {
    day: ShiftSlot[]
    evening: ShiftSlot[]
    night: ShiftSlot[]
  }>>({})
  const [homeStaff, setHomeStaff] = useState<HomeStaffMember[]>([])
  const [requests, setRequests] = useState<ScheduleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestsOpen, setRequestsOpen] = useState(true)

  const days = weekDays(monday)
  const today = todayStr()
  const pendingRequests = requests.filter(r => r.status === 'pending')

  async function fetchSchedule() {
    setError(null)
    try {
      const [schedRes, reqRes] = await Promise.all([
        getHomeSchedule(homeId, monday),
        isManager ? getScheduleRequests(homeId) : Promise.resolve(null),
      ])

      if (schedRes.data.success && schedRes.data.data) {
        setScheduleData(schedRes.data.data.schedule)
      }
      if (reqRes && reqRes.data.success && reqRes.data.data) {
        setRequests(reqRes.data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    }
  }

  // Fetch home staff once on mount (for add-slot dropdown)
  useEffect(() => {
    if (!isManager) return
    getHomeStaff(homeId)
      .then(res => {
        if (res.data.success && res.data.data) {
          setHomeStaff(res.data.data.filter(s => s.is_active))
        }
      })
      .catch(() => {/* non-critical */})
  }, [homeId, isManager])

  // Fetch schedule whenever homeId or monday changes
  useEffect(() => {
    setLoading(true)
    fetchSchedule().finally(() => setLoading(false))
  }, [homeId, monday])

  function getSlotsForCell(dateStr: string, shiftType: ShiftType): ShiftSlot[] {
    return scheduleData[dateStr]?.[shiftType] ?? []
  }

  async function handleAdd(dateStr: string, shiftType: ShiftType, userId: string) {
    await createShiftSlot(homeId, { user_id: userId, date: dateStr, shift_type: shiftType })
    await fetchSchedule()
  }

  async function handleRemove(slot: ShiftSlot) {
    const name = `${slot.first_name ?? ''} ${slot.last_name ?? ''}`.trim() || 'this person'
    if (!window.confirm(`Remove ${name} from this shift?`)) return
    await deleteShiftSlot(homeId, slot.id)
    await fetchSchedule()
  }

  async function handleApprove(req: ScheduleRequest) {
    await reviewScheduleRequest(homeId, req.id, { status: 'approved' })
    await fetchSchedule()
  }

  async function handleDeny(req: ScheduleRequest) {
    await reviewScheduleRequest(homeId, req.id, { status: 'denied' })
    await fetchSchedule()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className='p-4 space-y-4'>

      {/* ── Header / week nav ──────────────────────────────────────────────── */}
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <h2 className='text-base font-semibold text-zinc-900 dark:text-white'>Schedule</h2>
        <div className='flex items-center gap-1.5'>
          {/* Prev week */}
          <button
            onClick={() => setMonday(m => addDays(m, -7))}
            className='w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors'
            aria-label='Previous week'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>

          {/* Week range label */}
          <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-[200px] text-center'>
            {formatWeekRange(monday)}
          </span>

          {/* Next week */}
          <button
            onClick={() => setMonday(m => addDays(m, 7))}
            className='w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors'
            aria-label='Next week'
          >
            <ChevronRight className='h-4 w-4' />
          </button>

          {/* Today */}
          <button
            onClick={() => setMonday(getMondayOf(new Date()))}
            className='ml-1 text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors'
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className='bg-red-500/10 border border-red-500/20 rounded-lg p-3'>
          <p className='text-sm text-red-500'>{error}</p>
        </div>
      )}

      {/* ── Grid (desktop) / List (mobile) ─────────────────────────────────── */}
      {loading ? (
        <SkeletonGrid />
      ) : (
        <>
          {/* Desktop grid: hidden below md */}
          <div className='hidden md:block overflow-x-auto'>
            <div className='min-w-[640px] rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden'>

              {/* Column headers (day names) */}
              <div className='grid grid-cols-[100px_repeat(7,1fr)] bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800'>
                {/* Shift label column header (empty) */}
                <div className='px-3 py-2 border-r border-zinc-200 dark:border-zinc-800' />
                {days.map(dateStr => {
                  const { abbrev, num } = formatDayHeader(dateStr)
                  const isToday = dateStr === today
                  return (
                    <div
                      key={dateStr}
                      className={`px-2 py-2 text-center border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 ${
                        isToday ? 'bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {abbrev}
                      </p>
                      <p className={`text-base font-bold leading-tight ${isToday ? 'text-primary' : 'text-zinc-800 dark:text-zinc-100'}`}>
                        {num}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Shift rows */}
              {SHIFTS.map((shift, shiftIdx) => (
                <div
                  key={shift.id}
                  className={`grid grid-cols-[100px_repeat(7,1fr)] ${shiftIdx > 0 ? 'border-t border-zinc-200 dark:border-zinc-800' : ''}`}
                >
                  {/* Row label */}
                  <div className={`px-3 py-3 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex flex-col justify-start gap-0.5`}>
                    <div className={`flex items-center gap-1.5 ${shift.color.text}`}>
                      {shift.icon}
                      <span className='text-xs font-semibold'>{shift.label}</span>
                    </div>
                    <span className='text-[10px] text-zinc-400 dark:text-zinc-500'>{shift.time}</span>
                  </div>

                  {/* Day cells */}
                  {days.map((dateStr) => {
                    const isToday = dateStr === today
                    const slots = getSlotsForCell(dateStr, shift.id)
                    return (
                      <div
                        key={dateStr}
                        className={`border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 ${
                          isToday ? 'bg-primary/5 dark:bg-primary/10' : ''
                        }`}
                      >
                        <GridCell
                          slots={slots}
                          canEdit={isManager}
                          homeStaff={homeStaff}
                          onAdd={(userId) => handleAdd(dateStr, shift.id, userId)}
                          onRemove={handleRemove}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile list: shown below md */}
          <div className='md:hidden space-y-4'>
            {days.map(dateStr => {
              const { abbrev, num } = formatDayHeader(dateStr)
              const isToday = dateStr === today
              return (
                <div
                  key={dateStr}
                  className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'
                >
                  {/* Date header */}
                  <div className={`px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 ${isToday ? 'bg-primary/5 dark:bg-primary/10' : 'bg-zinc-50 dark:bg-zinc-900/80'}`}>
                    <p className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-zinc-800 dark:text-zinc-100'}`}>
                      {abbrev} {num}
                      {isToday && (
                        <span className='ml-2 text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded-full'>
                          Today
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Shifts for this day */}
                  {SHIFTS.map((shift, shiftIdx) => {
                    const slots = getSlotsForCell(dateStr, shift.id)
                    return (
                      <div
                        key={shift.id}
                        className={`px-4 py-3 ${shiftIdx > 0 ? 'border-t border-zinc-100 dark:border-zinc-800' : ''}`}
                      >
                        <div className={`flex items-center gap-1.5 mb-2 ${shift.color.text}`}>
                          {shift.icon}
                          <span className='text-xs font-semibold'>{shift.label}</span>
                          <span className='text-[10px] text-zinc-400 dark:text-zinc-500 ml-1'>{shift.time}</span>
                        </div>
                        <div className='flex flex-wrap gap-1.5 items-center'>
                          {slots.map(slot => (
                            <SlotChip
                              key={slot.id}
                              slot={slot}
                              canEdit={isManager}
                              onRemove={handleRemove}
                            />
                          ))}
                          {isManager && (
                            <AddButton
                              homeStaff={homeStaff}
                              onAdd={(userId) => handleAdd(dateStr, shift.id, userId)}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Time-off Requests (manager only) ───────────────────────────────── */}
      {isManager && !loading && pendingRequests.length > 0 && (
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'>
          {/* Collapsible header */}
          <button
            type='button'
            onClick={() => setRequestsOpen(v => !v)}
            className='w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors'
          >
            <div className='flex items-center gap-2'>
              <span className='text-sm font-semibold text-zinc-900 dark:text-white'>
                Time-off Requests
              </span>
              <span className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold'>
                {pendingRequests.length}
              </span>
            </div>
            {requestsOpen
              ? <ChevronUp className='h-4 w-4 text-zinc-400' />
              : <ChevronDown className='h-4 w-4 text-zinc-400' />}
          </button>

          {/* Request cards */}
          {requestsOpen && (
            <div className='px-4 pb-4 space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3'>
              {pendingRequests.map(req => (
                <RequestCard
                  key={req.id}
                  req={req}
                  onApprove={() => handleApprove(req)}
                  onDeny={() => handleDeny(req)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
