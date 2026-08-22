import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ClipboardList,
  Users,
  FileText,
  MessageSquare,
  CalendarDays,
  Phone,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHome } from '../../context/HomeContext'
import { useRole } from '../../utils/role'
import { useDashboard } from '../../hooks/useDashboard'
import AddAppointmentForm from '../../components/AddAppointmentForm'
import AnnouncementComposer from './AnnouncementComposer'
import { currentShift } from '../../types/log'
import { todayStr } from '../../utils/date'
import { clockIn, clockOut } from '../../api/homes'
import { pinAnnouncement, deleteAnnouncement } from '../../api/logs'
import { getLiveRoster } from '../../api/schedule'
import type { Appointment } from '../../types/appointment'
import type { Announcement } from '../../types/log'
import type { OnNowEntry } from '../../types/schedule'

// ── Helpers ──────────────────────────────────────────────────────────────────

const SHIFT_TIME: Record<string, string> = {
  day:     '07:00–14:59',
  evening: '15:00–22:59',
  night:   '23:00–06:59',
}

function formatShiftName(shift: string): string {
  return `${shift.charAt(0).toUpperCase()}${shift.slice(1)} Shift`
}

function formatApptTime(timeStr: string | null): { time: string; period: string } {
  if (!timeStr) return { time: '--', period: '' }
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return { time: `${hour12}:${m}`, period }
}

function getResidentName(
  residentId: string,
  residents: { id: string; first_name: string; last_name: string }[],
): string {
  const r = residents.find(r => r.id === residentId)
  return r ? `${r.first_name} ${r.last_name}` : 'Resident'
}

// ── Sub-sections ─────────────────────────────────────────────────────────────

function AnnouncementCard({
  announcements,
  isAdmin,
  onRefresh,
}: {
  announcements: Announcement[]
  isAdmin:       boolean
  onRefresh:     () => void
}) {
  const [acting, setActing] = useState<string | null>(null)

  async function handlePin(id: string) {
    setActing(id)
    try { await pinAnnouncement(id); onRefresh() }
    finally { setActing(null) }
  }

  async function handleDelete(id: string) {
    setActing(id)
    try { await deleteAnnouncement(id); onRefresh() }
    finally { setActing(null) }
  }

  if (!announcements.length) {
    return (
      <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-sm text-zinc-400 dark:text-zinc-500'>
        No announcements yet.
      </div>
    )
  }

  // Pinned first, then chronological
  const sorted = [...announcements].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className='mx-4 space-y-2'>
      {sorted.map(a => {
        const posterName = a.poster_first && a.poster_last
          ? `${a.poster_first} ${a.poster_last}`
          : 'Staff'

        return (
          <div
            key={a.id}
            className='rounded-lg p-4 border border-violet-800/40'
            style={{ background: 'linear-gradient(135deg, #1a1040, #0f0a2a)' }}
          >
            <div className='flex items-start justify-between gap-2'>
              <div className='flex items-center gap-2 flex-wrap flex-1 min-w-0'>
                {a.is_pinned && (
                  <span className='bg-violet-500/30 text-violet-300 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0'>
                    Pinned
                  </span>
                )}
                {a.title && (
                  <span className='text-violet-300 text-[11px] font-semibold'>{a.title}</span>
                )}
              </div>

              {isAdmin && (
                <div className='flex items-center gap-1 shrink-0'>
                  <button
                    onClick={() => { void handlePin(a.id) }}
                    disabled={acting === a.id}
                    className='text-[11px] font-semibold text-violet-400 hover:text-violet-200 px-2 py-1 rounded-lg min-h-[28px] disabled:opacity-50 transition-colors'
                  >
                    {a.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={() => { void handleDelete(a.id) }}
                    disabled={acting === a.id}
                    className='text-[11px] font-semibold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg min-h-[28px] disabled:opacity-50 transition-colors'
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            <p className='text-violet-200 text-sm leading-relaxed mt-2'>{a.body}</p>
            <p className='text-violet-400/60 text-xs mt-1.5'>{posterName}</p>
          </div>
        )
      })}
    </div>
  )
}

function NeedsAttentionSection({
  unfiledIposCount,
}: {
  unfiledIposCount: number
}) {
  if (unfiledIposCount === 0) return null

  return (
    <div className='mt-5'>
      <p className='text-base font-semibold text-zinc-900 dark:text-white px-4 mb-3'>
        Needs Attention
      </p>

      <div className='mx-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center gap-3 p-3.5'>
        <div className='w-2 h-2 rounded-full bg-amber-500 shrink-0' />
        <div className='flex-1'>
          <p className='text-sm font-medium text-zinc-900 dark:text-white'>IPOS logs pending</p>
          <p className='text-xs text-zinc-500 dark:text-zinc-400'>For today's shifts</p>
        </div>
        <span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400'>
          {unfiledIposCount}
        </span>
      </div>
    </div>
  )
}

function UpcomingAppointmentsSection({
  appointments,
  residents,
  onAdd,
}: {
  appointments: Appointment[]
  residents: { id: string; first_name: string; last_name: string }[]
  onAdd: () => void
}) {
  if (!appointments.length) return null

  return (
    <div className='mt-5'>
      <div className='flex items-center justify-between px-4 mb-3'>
        <p className='text-base font-semibold text-zinc-900 dark:text-white'>
          Upcoming Appointments
        </p>
        <button
          onClick={onAdd}
          className='text-primary text-sm font-medium min-h-[44px] flex items-center'
        >
          + Add
        </button>
      </div>

      {appointments.map(appt => {
        const { time, period } = formatApptTime(appt.appointment_time)
        const residentName = getResidentName(appt.resident_id, residents)
        return (
          <div
            key={appt.id}
            className='mx-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center gap-3 p-3'
          >
            <div className='bg-zinc-100 dark:bg-zinc-800 rounded-md px-2.5 py-2 text-center min-w-[44px] shrink-0'>
              <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{time}</p>
              <p className='text-[10px] text-zinc-400'>{period}</p>
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-zinc-900 dark:text-white truncate'>{appt.title}</p>
              <p className='text-xs text-zinc-500 dark:text-zinc-400 truncate'>
                {residentName}{appt.location ? ` · ${appt.location}` : ''}
              </p>
            </div>
            <span className='text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0'>
              Today
            </span>
          </div>
        )
      })}
    </div>
  )
}

function getInitials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

const SHIFT_BADGE: Record<string, string> = {
  day: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  evening: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  night: 'bg-primary/10 text-primary border border-primary/20',
}

function WhosOnNowSection({ homeId }: { homeId: string | null }) {
  const [onNow, setOnNow] = useState<OnNowEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!homeId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    getLiveRoster(homeId)
      .then(res => {
        if (cancelled) return
        if (res.data.success && res.data.data) setOnNow(res.data.data.onNow)
      })
      .catch(() => {/* non-critical */})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [homeId])

  if (!homeId) return null

  return (
    <div className='mx-4 mt-3'>
      <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'>
        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 px-4 pt-3 pb-2'>
          Who's On Now
        </p>

        {loading ? (
          <div className='px-4 pb-4 text-sm text-zinc-400 dark:text-zinc-500'>Loading…</div>
        ) : onNow.length === 0 ? (
          <div className='px-4 pb-4 text-sm text-zinc-400 dark:text-zinc-500'>No one else clocked in right now.</div>
        ) : (
          <div className='pb-1'>
            {onNow.map(p => (
              <div key={p.user_id} className='flex items-center gap-3 px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800'>
                <div className='w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0'>
                  {getInitials(p.first_name, p.last_name)}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-zinc-900 dark:text-white truncate'>
                    {p.first_name} {p.last_name}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${SHIFT_BADGE[p.shift] ?? ''}`}>
                  {p.shift.charAt(0).toUpperCase() + p.shift.slice(1)}
                </span>
                {p.phone && (
                  <a
                    href={`tel:${p.phone}`}
                    aria-label={`Call ${p.first_name} ${p.last_name}`}
                    className='w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0'
                  >
                    <Phone className='w-3.5 h-3.5' />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuickActionsSection() {
  const navigate = useNavigate()
  return (
    <div className='mt-5'>
      <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 px-4 pt-5 pb-2'>
        Quick Actions
      </p>
      <div className='grid grid-cols-3 gap-2.5 px-4'>
        <button onClick={() => navigate('/logs?tab=ipos')} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 flex flex-col items-center gap-2 min-h-[80px] cursor-pointer'>
          <div className='w-9 h-9 rounded-md flex items-center justify-center bg-primary/10 text-primary'>
            <FileText className='w-5 h-5' />
          </div>
          <span className='text-xs font-medium text-zinc-700 dark:text-zinc-300 text-center'>New Log</span>
        </button>
        <button onClick={() => navigate('/calendar')} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 flex flex-col items-center gap-2 min-h-[80px] cursor-pointer'>
          <div className='w-9 h-9 rounded-md flex items-center justify-center bg-emerald-500/20 text-emerald-400'>
            <CalendarDays className='w-5 h-5' />
          </div>
          <span className='text-xs font-medium text-zinc-700 dark:text-zinc-300 text-center'>Appointments</span>
        </button>
        <button onClick={() => navigate('/logs?tab=shift-notes')} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 flex flex-col items-center gap-2 min-h-[80px] cursor-pointer'>
          <div className='w-9 h-9 rounded-md flex items-center justify-center bg-violet-500/20 text-violet-400'>
            <MessageSquare className='w-5 h-5' />
          </div>
          <span className='text-xs font-medium text-zinc-700 dark:text-zinc-300 text-center'>Shift Note</span>
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user }   = useAuth()
  const navigate           = useNavigate()
  const { homeId, homes, isLoading: homeIsLoading } = useHome()
  const { isAdmin } = useRole()
  const {
    announcements,
    appointments,
    residents,
    unfiledIposCount,
    staffOnShiftCount,
    isShiftActive,
    isLoading,
    refresh,
  } = useDashboard(homeId)

  const [showAddAppt, setShowAddAppt] = useState(false)
  const [clocking, setClocking] = useState(false)

  async function handleClockIn() {
    if (!homeId) return
    setClocking(true)
    try { await clockIn(homeId, { shift: currentShift(), shift_date: todayStr() }); refresh() }
    catch { /* roster still reflects correct state */ }
    finally { setClocking(false) }
  }

  async function handleClockOut() {
    if (!homeId) return
    setClocking(true)
    try { await clockOut(homeId, { shift: currentShift(), shift_date: todayStr() }); refresh() }
    catch { /* roster still reflects correct state */ }
    finally { setClocking(false) }
  }

  const shift     = currentShift()
  const shiftTime = SHIFT_TIME[shift]

  // Redirect multi-home admins to home selection screen when no home chosen
  useEffect(() => {
    if (homeIsLoading) return
    if (isAdmin && homes.length > 1 && !homeId) {
      navigate('/select-home', { replace: true })
    }
  }, [homeIsLoading, isAdmin, homes.length, homeId, navigate])

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className='bg-zinc-50 dark:bg-zinc-950 min-h-screen pb-8'>
      <div className='max-w-4xl mx-auto'>

      {/* Section 1 — Page Header */}
      <div className='px-4 pt-5 pb-3'>
        <p className='text-[13px] text-zinc-500 dark:text-zinc-400 mb-0.5'>{dateStr}</p>
        <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>
          Welcome back, {user?.first_name ?? 'there'}
        </h1>
      </div>

      {/* Section 2 — Shift Strip */}
      <div className='mx-4 mt-0 mb-0'>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex items-center justify-between'>
          <div>
            <p className='text-xs text-zinc-400 dark:text-zinc-500 mb-1'>Current shift</p>
            <p className='text-base font-semibold text-zinc-900 dark:text-white'>
              {formatShiftName(shift)}
            </p>
            <p className='text-xs text-zinc-500 dark:text-zinc-400'>{shiftTime}</p>
          </div>
          <div className='flex items-center gap-2'>
            {isShiftActive ? (
              <>
                <span className='bg-emerald-500/15 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full'>
                  Active
                </span>
                <button disabled={clocking} onClick={() => { void handleClockOut() }}
                  className='bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs px-3 py-1.5 rounded-lg min-h-[32px] disabled:opacity-50'>
                  {clocking ? '…' : 'Clock Out'}
                </button>
              </>
            ) : (
              <button disabled={clocking} onClick={() => { void handleClockIn() }}
                className='bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[32px] disabled:opacity-50'>
                {clocking ? '…' : 'Clock In'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 2b — Who's On Now */}
      <WhosOnNowSection homeId={homeId} />

      {/* Section 2c — Residents link (staff only; admins already have it in nav) */}
      {!isAdmin && (
        <div className='mx-4 mt-3'>
          <button
            onClick={() => navigate('/residents')}
            className='w-full flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 cursor-pointer'
          >
            <div className='w-9 h-9 rounded-md flex items-center justify-center bg-primary/10 text-primary shrink-0'>
              <Users className='w-4 h-4' />
            </div>
            <span className='text-sm font-medium text-zinc-900 dark:text-white flex-1 text-left'>Residents</span>
            <ChevronRight className='text-zinc-400 dark:text-zinc-600 h-4 w-4' />
          </button>
        </div>
      )}

      {/* Section 3 — Stat Cards (admin only) */}
      {isAdmin && (
        <div className='px-4 mt-4'>
          <div className='grid grid-cols-2 gap-2.5'>
            {/* IPOS pending */}
            <div onClick={() => navigate('/logs?tab=ipos')} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 cursor-pointer'>
              <div className='flex items-center justify-between'>
                <div className='w-8 h-8 rounded-md flex items-center justify-center bg-amber-500/15 text-amber-400'>
                  <ClipboardList className='w-4 h-4' />
                </div>
                <ChevronRight className='text-zinc-400 dark:text-zinc-600 h-4 w-4' />
              </div>
              <p className='text-2xl font-bold tracking-tight leading-none mt-2 text-amber-500'>
                {unfiledIposCount}
              </p>
              <p className='text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1'>IPOS pending</p>
            </div>

            {/* Staff on shift */}
            <div onClick={() => navigate('/calendar')} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 cursor-pointer'>
              <div className='flex items-center justify-between'>
                <div className='w-8 h-8 rounded-md flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'>
                  <Users className='w-4 h-4' />
                </div>
                <ChevronRight className='text-zinc-400 dark:text-zinc-600 h-4 w-4' />
              </div>
              <p className='text-2xl font-bold tracking-tight leading-none mt-2 text-zinc-900 dark:text-white'>
                {staffOnShiftCount}
              </p>
              <p className='text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1'>Staff on shift</p>
            </div>
          </div>
        </div>
      )}

      {/* Section 4 — Announcements "From Management" */}
      <div className='mt-5'>
        <p className='text-base font-semibold text-zinc-900 dark:text-white px-4 mb-3'>
          From Management
        </p>
        <AnnouncementCard announcements={announcements} isAdmin={isAdmin} onRefresh={refresh} />

        {/* Admin: Announcement Composer */}
        {isAdmin && homeId && (
          <div className='mt-3'>
            <AnnouncementComposer homeId={homeId} onPosted={refresh} />
          </div>
        )}
      </div>

      {/* Section 5 — Needs Attention */}
      <NeedsAttentionSection unfiledIposCount={unfiledIposCount} />

      {/* Section 6 — Upcoming Appointments */}
      <UpcomingAppointmentsSection
        appointments={appointments}
        residents={residents}
        onAdd={() => setShowAddAppt(true)}
      />

      {/* Section 7 — Quick Actions */}
      <QuickActionsSection />

      {/* Loading spinner (initial load only) */}
      {isLoading && !announcements.length && (
        <div className='flex justify-center mt-10'>
          <div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' />
        </div>
      )}

      {/* Add Appointment Sheet */}
      {showAddAppt && homeId && (
        <AddAppointmentForm
          homeId={homeId}
          residents={residents}
          onSuccess={() => { setShowAddAppt(false); refresh() }}
          onCancel={() => setShowAddAppt(false)}
        />
      )}
      </div>
    </div>
  )
}
