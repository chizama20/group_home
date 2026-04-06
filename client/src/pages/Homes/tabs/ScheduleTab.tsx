import { useState, useEffect } from 'react'
import { Calendar, Clock, Sun, Moon, Sunrise } from 'lucide-react'
import { getHomeRoster, getHomeStaff, type RosterEntry, type HomeStaffMember } from '../../../api/homes'
import type { Shift } from '../../../types/log'
import { todayStr } from '../../../utils/date'

interface Props {
  homeId: string
}

const SHIFTS: { id: Shift; label: string; icon: React.ReactNode; time: string }[] = [
  { id: 'day',     label: 'Day',     icon: <Sun className='h-4 w-4' />,     time: '07:00 - 14:59' },
  { id: 'evening', label: 'Evening', icon: <Sunrise className='h-4 w-4' />, time: '15:00 - 22:59' },
  { id: 'night',   label: 'Night',   icon: <Moon className='h-4 w-4' />,    time: '23:00 - 06:59' },
]

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

interface RosterWithStaff extends RosterEntry {
  first_name?: string
  last_name?: string
  role?: string
}

function ShiftCard({
  shift,
  roster,
  staff,
}: {
  shift: typeof SHIFTS[number]
  roster: RosterWithStaff[]
  staff: HomeStaffMember[]
}) {
  // Match roster entries with staff details
  const assignedStaff = roster.map(r => {
    const s = staff.find(st => st.id === r.user_id)
    return {
      ...r,
      first_name: r.first_name ?? s?.first_name ?? 'Unknown',
      last_name: r.last_name ?? s?.last_name ?? '',
      role: r.role ?? s?.role ?? 'employee',
    }
  })

  const shiftColors = {
    day:     { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-200 dark:border-amber-900/40' },
    evening: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-200 dark:border-violet-900/40' },
    night:   { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-200 dark:border-indigo-900/40' },
  }

  const colors = shiftColors[shift.id]

  return (
    <div className={`bg-white dark:bg-zinc-900 border ${colors.border} rounded-2xl p-4`}>
      {/* Header */}
      <div className='flex items-center gap-3 mb-3'>
        <div className={`w-9 h-9 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center`}>
          {shift.icon}
        </div>
        <div>
          <h3 className='text-sm font-semibold text-zinc-900 dark:text-white'>
            {shift.label} Shift
          </h3>
          <p className='text-xs text-zinc-500 dark:text-zinc-400'>
            {shift.time}
          </p>
        </div>
      </div>

      {/* Staff chips */}
      {assignedStaff.length === 0 ? (
        <p className='text-xs text-zinc-400 dark:text-zinc-500 py-2'>
          No staff scheduled
        </p>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {assignedStaff.map(s => (
            <div
              key={s.id}
              className='flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-full pl-1 pr-3 py-1'
            >
              <div className='w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center'>
                {getInitials(s.first_name!, s.last_name!)}
              </div>
              <span className='text-xs text-zinc-700 dark:text-zinc-300 font-medium'>
                {s.first_name} {s.last_name?.charAt(0)}.
              </span>
              {s.clocked_in_at && !s.clocked_out_at && (
                <span className='w-2 h-2 rounded-full bg-emerald-500' title='Clocked in' />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4'>
      <div className='flex items-center gap-3 mb-3'>
        <div className='w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse' />
        <div className='space-y-1'>
          <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-20' />
          <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-24' />
        </div>
      </div>
      <div className='flex gap-2'>
        <div className='h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse w-24' />
        <div className='h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse w-24' />
      </div>
    </div>
  )
}

export default function ScheduleTab({ homeId }: Props) {
  const [roster, setRoster] = useState<RosterWithStaff[]>([])
  const [staff, setStaff] = useState<HomeStaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayStr())

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const [rosterRes, staffRes] = await Promise.all([
          getHomeRoster(homeId, { date: selectedDate }),
          getHomeStaff(homeId)
        ])
        if (rosterRes.data.success && rosterRes.data.data) {
          setRoster(rosterRes.data.data as RosterWithStaff[])
        }
        if (staffRes.data.success && staffRes.data.data) {
          setStaff(staffRes.data.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedule')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [homeId, selectedDate])

  // Group roster by shift
  const rosterByShift: Record<Shift, RosterWithStaff[]> = {
    day: roster.filter(r => r.shift === 'day'),
    evening: roster.filter(r => r.shift === 'evening'),
    night: roster.filter(r => r.shift === 'night'),
  }

  // Format date for display
  const dateObj = new Date(selectedDate + 'T12:00:00')
  const isToday = selectedDate === todayStr()
  const formattedDate = isToday
    ? 'Today'
    : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className='p-4 space-y-4'>
      {/* Date selector */}
      <div className='flex items-center gap-3'>
        <div className='flex-1 flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-zinc-400' />
          <span className='text-sm font-medium text-zinc-900 dark:text-white'>
            {formattedDate}
          </span>
        </div>
        <input
          type='date'
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className='bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white'
        />
      </div>

      {/* Error */}
      {error && (
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4'>
          <p className='text-sm text-red-500'>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className='space-y-3'>
          {SHIFTS.map(shift => (
            <SkeletonCard key={shift.id} />
          ))}
        </div>
      )}

      {/* Shift cards */}
      {!loading && !error && (
        <div className='space-y-3'>
          {SHIFTS.map(shift => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              roster={rosterByShift[shift.id]}
              staff={staff}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className='flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 pt-2'>
        <div className='flex items-center gap-1.5'>
          <Clock className='h-3.5 w-3.5' />
          <span>Scheduled</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='w-2 h-2 rounded-full bg-emerald-500' />
          <span>Currently clocked in</span>
        </div>
      </div>
    </div>
  )
}
