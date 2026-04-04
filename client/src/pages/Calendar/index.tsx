import { useState, useEffect, useMemo } from 'react'
import { useHome } from '../../context/HomeContext'
import { getHomeMedications } from '../../api/medications'
import { getHomeAppointments } from '../../api/appointments'
import type { Medication } from '../../types/medication'
import type { Appointment } from '../../types/appointment'
import { todayStr } from '../../utils/date'
import { cn } from '../../lib/cn'

// ── Types ──────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'meds' | 'appointments'

interface MedRound {
  kind: 'med'
  time: string        // 'HH:MM' 24-hour
  displayTime: string // e.g. '8:00'
  displayAmPm: string // 'AM' | 'PM'
  medications: Medication[]
  residents: ResidentSummary[]
  isDone: boolean
  isDueSoon: boolean  // within 30 min and not past
  isActive: boolean   // past scheduled time, not all given
  isLocked: boolean   // future > 30 min
  sortKey: number     // minutes since midnight
}

interface ApptEvent {
  kind: 'appt'
  time: string
  displayTime: string
  displayAmPm: string
  appointment: Appointment
  isPast: boolean
  sortKey: number
}

type TimelineEvent = MedRound | ApptEvent

interface ResidentSummary {
  id: string
  initials: string
  name: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function formatDisplayTime(hhmm: string): { display: string; ampm: string } {
  const mins = parseHHMM(hhmm)
  const h24 = Math.floor(mins / 60)
  const m = mins % 60
  const ampm = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return { display: `${h12}:${String(m).padStart(2, '0')}`, ampm }
}

function nowMinutes(): number {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}

function buildMedRounds(meds: Medication[], selectedDate: string): MedRound[] {
  const today = todayStr()
  const isToday = selectedDate === today
  const isPast = selectedDate < today

  const slotMap = new Map<string, Medication[]>()
  for (const med of meds) {
    if (!med.is_active) continue
    const slot = med.scheduled_time ? med.scheduled_time.slice(0, 5) : 'Unscheduled'
    if (!slotMap.has(slot)) slotMap.set(slot, [])
    slotMap.get(slot)!.push(med)
  }

  const rounds: MedRound[] = []
  for (const [slot, slotMeds] of slotMap.entries()) {
    if (slot === 'Unscheduled') continue // skip unscheduled for timeline

    const slotMins = parseHHMM(slot)
    const nowMins = nowMinutes()
    const diffMins = slotMins - nowMins

    // Determine state based on date context
    let isDone = false
    let isDueSoon = false
    let isActive = false
    let isLocked = false

    if (isPast) {
      isDone = true
    } else if (isToday) {
      if (diffMins <= 0) {
        // Past the scheduled time — treat as active (no real administered tracking here)
        isActive = true
      } else if (diffMins <= 30) {
        isDueSoon = true
      } else {
        isLocked = true
      }
    } else {
      // Future date
      isLocked = true
    }

    const residentMap = new Map<string, ResidentSummary>()
    for (const med of slotMeds) {
      if (!residentMap.has(med.resident_id)) {
        const name = med.first_name && med.last_name
          ? `${med.first_name} ${med.last_name}`
          : med.resident_id
        const initials = med.first_name && med.last_name
          ? `${med.first_name[0]}${med.last_name[0]}`.toUpperCase()
          : med.resident_id.slice(0, 2).toUpperCase()
        residentMap.set(med.resident_id, { id: med.resident_id, initials, name })
      }
    }

    const { display, ampm } = formatDisplayTime(slot)

    rounds.push({
      kind: 'med',
      time: slot,
      displayTime: display,
      displayAmPm: ampm,
      medications: slotMeds,
      residents: [...residentMap.values()],
      isDone,
      isDueSoon,
      isActive,
      isLocked,
      sortKey: slotMins,
    })
  }

  return rounds.sort((a, b) => a.sortKey - b.sortKey)
}

function buildApptEvents(appointments: Appointment[], selectedDate: string): ApptEvent[] {
  const today = todayStr()

  return appointments
    .filter(a => a.appointment_date.slice(0, 10) === selectedDate)
    .map(a => {
      const timeStr = a.appointment_time ? a.appointment_time.slice(0, 5) : '00:00'
      const slotMins = parseHHMM(timeStr)
      const nowMins = nowMinutes()
      const isPast = selectedDate < today || (selectedDate === today && slotMins < nowMins)
      const { display, ampm } = formatDisplayTime(timeStr)

      return {
        kind: 'appt' as const,
        time: timeStr,
        displayTime: display,
        displayAmPm: ampm,
        appointment: a,
        isPast,
        sortKey: slotMins,
      }
    })
    .sort((a, b) => a.sortKey - b.sortKey)
}

function getDayStrip(): { dateStr: string; dayName: string; dayNum: number }[] {
  const today = new Date()
  const result = []
  for (let i = -7; i <= 6; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)
    const dayNum = d.getDate()
    result.push({ dateStr, dayName, dayNum })
  }
  return result
}

function appointmentTypeColors(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('gp') || t.includes('doctor') || t.includes('medical'))
    return 'bg-violet-500/15 text-violet-400'
  if (t.includes('therapy') || t.includes('counsell'))
    return 'bg-cyan-500/15 text-cyan-400'
  if (t.includes('pickup') || t.includes('transport'))
    return 'bg-amber-500/15 text-amber-400'
  return 'bg-zinc-500/15 text-zinc-400'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TimelineSkeletons() {
  return (
    <div className='px-4 space-y-4'>
      {[...Array(4)].map((_, i) => (
        <div key={i} className='flex gap-0 animate-pulse'>
          {/* time col */}
          <div className='w-[52px] pt-3 pr-3 shrink-0'>
            <div className='h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-8 ml-auto' />
          </div>
          {/* connector col */}
          <div className='w-4 flex flex-col items-center shrink-0'>
            <div className='w-2.5 h-2.5 rounded-full mt-3 bg-zinc-200 dark:bg-zinc-800 shrink-0' />
            <div className='flex-1 w-px bg-zinc-200 dark:bg-zinc-800 mt-1' />
          </div>
          {/* card col */}
          <div className='flex-1 pb-3 pl-1'>
            <div className='bg-zinc-100 dark:bg-zinc-800 rounded-xl h-[72px]' />
          </div>
        </div>
      ))}
    </div>
  )
}

function MedRoundCard({ round }: { round: MedRound }) {
  const total = round.medications.length
  const given = round.isDone ? total : 0

  if (round.isDone) {
    return (
      <div className='opacity-60'>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5'>
          <div className='flex items-start justify-between gap-2'>
            <div>
              <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                {round.displayTime} {round.displayAmPm} Round
              </p>
              <p className='text-xs text-zinc-400 mt-0.5'>{total} medication{total !== 1 ? 's' : ''}</p>
            </div>
            <span className='bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0'>
              Done
            </span>
          </div>
          <div className='mt-2 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden'>
            <div className='h-full bg-emerald-500 rounded-full w-full' />
          </div>
          <p className='text-xs text-zinc-400 mt-1'>{given}/{total} given</p>
        </div>
      </div>
    )
  }

  if (round.isLocked) {
    return (
      <div className='bg-white/60 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/50 rounded-xl p-3.5 opacity-50'>
        <div className='flex items-center gap-2'>
          <svg className='w-3.5 h-3.5 text-zinc-400 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
            <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
            <path d='M7 11V7a5 5 0 0 1 10 0v4' />
          </svg>
          <p className='text-sm font-semibold text-zinc-400'>
            {round.displayTime} {round.displayAmPm} Round
          </p>
        </div>
        <p className='text-xs text-zinc-400 mt-1'>{total} medication{total !== 1 ? 's' : ''} · Scheduled {round.displayTime} {round.displayAmPm}</p>
      </div>
    )
  }

  // Active or due soon
  return (
    <div className='bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/30 rounded-xl p-3.5'>
      <div className='flex items-start justify-between gap-2'>
        <div>
          <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
            {round.displayTime} {round.displayAmPm} Round
          </p>
          <p className='text-xs text-zinc-400 mt-0.5'>{total} medication{total !== 1 ? 's' : ''}</p>
        </div>
        <span className='bg-amber-500/10 text-amber-500 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0'>
          {round.isDueSoon ? 'Due soon' : 'Active'}
        </span>
      </div>

      {/* Resident avatars */}
      {round.residents.length > 0 && (
        <div className='flex mt-2.5'>
          {round.residents.slice(0, 5).map((r, idx) => (
            <div
              key={r.id}
              title={r.name}
              className={cn(
                'w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold flex items-center justify-center border border-white dark:border-zinc-900 shrink-0',
                idx > 0 ? '-ml-1.5' : ''
              )}
            >
              {r.initials}
            </div>
          ))}
          {round.residents.length > 5 && (
            <div className='-ml-1.5 w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 text-[10px] font-bold flex items-center justify-center border border-white dark:border-zinc-900 shrink-0'>
              +{round.residents.length - 5}
            </div>
          )}
        </div>
      )}

      <button
        type='button'
        className='bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-lg min-h-[36px] mt-2 w-full'
      >
        Administer
      </button>
    </div>
  )
}

function AppointmentCard({ event }: { event: ApptEvent }) {
  const appt = event.appointment
  const typeLabel = appt.type.charAt(0).toUpperCase() + appt.type.slice(1).replace(/_/g, ' ')
  const typeStyle = appointmentTypeColors(appt.type)

  return (
    <div className={cn(
      'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5',
      event.isPast && 'opacity-65'
    )}>
      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mb-2', typeStyle)}>
        {typeLabel}
      </span>
      <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{appt.title}</p>
      {appt.location && (
        <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>{appt.location}</p>
      )}
      <div className='flex gap-3 mt-1.5 text-xs text-zinc-400'>
        <span>{event.displayTime} {event.displayAmPm}</span>
        {appt.collector_name && <span>Escorted by {appt.collector_name}</span>}
      </div>
    </div>
  )
}

function DotColor({ event }: { event: TimelineEvent }): JSX.Element {
  if (event.kind === 'appt') {
    return <div className='w-2.5 h-2.5 rounded-full mt-3 shrink-0 bg-violet-400' />
  }
  const r = event as MedRound
  if (r.isDone) {
    return <div className='w-2.5 h-2.5 rounded-full mt-3 shrink-0 bg-emerald-400' />
  }
  if (r.isDueSoon || r.isActive) {
    return <div className='w-2.5 h-2.5 rounded-full mt-3 shrink-0 bg-amber-400' />
  }
  return <div className='w-2.5 h-2.5 rounded-full mt-3 shrink-0 bg-zinc-300 dark:bg-zinc-700' />
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { homeId } = useHome()
  const [selectedDate, setSelectedDate] = useState<string>(todayStr())
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [medications, setMedications]   = useState<Medication[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(false)

  // Fetch medications and appointments when home changes
  useEffect(() => {
    if (!homeId) return
    setLoading(true)
    Promise.all([
      getHomeMedications(homeId),
      getHomeAppointments(homeId, { from: selectedDate, days: 1 }),
    ])
      .then(([medsRes, apptsRes]) => {
        setMedications(medsRes.data.data ?? [])
        setAppointments(apptsRes.data.data ?? [])
      })
      .catch(() => {
        // Silently fail — page still renders with empty state
      })
      .finally(() => setLoading(false))
  }, [homeId, selectedDate])

  const dayStrip = useMemo(() => getDayStrip(), [])

  const medRounds = useMemo(
    () => buildMedRounds(medications, selectedDate),
    [medications, selectedDate]
  )

  const apptEvents = useMemo(
    () => buildApptEvents(appointments, selectedDate),
    [appointments, selectedDate]
  )

  // Merge and filter
  const allEvents = useMemo<TimelineEvent[]>(() => {
    const base: TimelineEvent[] = [
      ...(activeFilter !== 'appointments' ? medRounds : []),
      ...(activeFilter !== 'meds'         ? apptEvents : []),
    ]
    return base.sort((a, b) => a.sortKey - b.sortKey)
  }, [medRounds, apptEvents, activeFilter])

  // Insert "Now" line between past and future events (only on today)
  const today = todayStr()
  const isToday = selectedDate === today
  const nowMins = nowMinutes()

  // Current time display
  const nowHour24 = Math.floor(nowMins / 60)
  const nowMin = nowMins % 60
  const nowAmPm = nowHour24 < 12 ? 'AM' : 'PM'
  const nowH12 = nowHour24 % 12 === 0 ? 12 : nowHour24 % 12
  const nowLabel = `${nowH12}:${String(nowMin).padStart(2, '0')} ${nowAmPm}`

  // Find index where "Now" line should be inserted
  let nowInsertIdx = -1
  if (isToday) {
    nowInsertIdx = allEvents.findIndex(e => e.sortKey >= nowMins)
    if (nowInsertIdx === -1 && allEvents.length > 0) nowInsertIdx = allEvents.length
  }

  return (
    <div className='pb-8 min-h-screen bg-zinc-50 dark:bg-black'>
      <div className='max-w-4xl mx-auto'>

      {/* Header */}
      <div className='px-4 pt-5 pb-3 flex items-center justify-between'>
        <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Schedule</h1>
        <button
          type='button'
          onClick={() => setSelectedDate(todayStr())}
          className='bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full min-h-[32px]'
        >
          Today
        </button>
      </div>

      {/* Day strip */}
      <div className='flex gap-2 px-4 pb-3 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
        {dayStrip.map(day => {
          const isSelected = day.dateStr === selectedDate
          return (
            <button
              key={day.dateStr}
              type='button'
              onClick={() => setSelectedDate(day.dateStr)}
              className={cn(
                'flex flex-col items-center px-3 py-2 rounded-xl shrink-0 min-w-[44px] cursor-pointer',
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
              )}
            >
              <span className='text-[10px] font-semibold uppercase'>{day.dayName}</span>
              <span className='text-base font-bold mt-0.5'>{day.dayNum}</span>
            </button>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className='flex gap-2 px-4 mb-4'>
        {(['all', 'meds', 'appointments'] as FilterType[]).map(f => {
          const label = f === 'all' ? 'All' : f === 'meds' ? 'Meds' : 'Appointments'
          const isActive = activeFilter === f
          return (
            <button
              key={f}
              type='button'
              onClick={() => setActiveFilter(f)}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-full min-h-[32px] border',
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      {loading ? (
        <TimelineSkeletons />
      ) : allEvents.length === 0 ? (
        <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center'>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No events scheduled for this day.</p>
        </div>
      ) : (
        <div className='px-4'>
          {(() => {
            const rows: JSX.Element[] = []
            let lastTime = ''

            allEvents.forEach((event, idx) => {
              // Insert "Now" line before this item if needed
              if (isToday && idx === nowInsertIdx) {
                rows.push(
                  <div key='now-line' className='flex items-center gap-2 py-1 -mx-4 px-4'>
                    <div className='w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-500/25 shrink-0' />
                    <span className='text-indigo-500 text-xs font-semibold'>Now</span>
                    <div className='flex-1 h-px bg-indigo-400/40' />
                    <span className='text-indigo-500 text-xs font-semibold'>{nowLabel}</span>
                  </div>
                )
              }

              const showTime = event.time !== lastTime
              if (showTime) lastTime = event.time

              rows.push(
                <div key={`${event.kind}-${event.kind === 'med' ? event.time : event.appointment.id}`} className='flex'>
                  {/* Time col */}
                  <div className='w-[52px] text-right pt-3 pr-3 shrink-0'>
                    {showTime ? (
                      <>
                        <p className='text-[11px] text-zinc-400 dark:text-zinc-600 leading-none'>{event.displayTime}</p>
                        <p className='text-[11px] text-zinc-500 leading-none mt-0.5'>{event.displayAmPm}</p>
                      </>
                    ) : null}
                  </div>

                  {/* Connector col */}
                  <div className='w-4 flex flex-col items-center shrink-0'>
                    <DotColor event={event} />
                    {idx < allEvents.length - 1 && (
                      <div className='flex-1 w-px bg-zinc-200 dark:bg-zinc-800 mt-1' />
                    )}
                  </div>

                  {/* Card col */}
                  <div className='flex-1 pb-3 pl-1'>
                    {event.kind === 'med' ? (
                      <MedRoundCard round={event as MedRound} />
                    ) : (
                      <AppointmentCard event={event as ApptEvent} />
                    )}
                  </div>
                </div>
              )
            })

            // "Now" line at end if all events are past
            if (isToday && nowInsertIdx === allEvents.length) {
              rows.push(
                <div key='now-line-end' className='flex items-center gap-2 py-1 -mx-4 px-4'>
                  <div className='w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-500/25 shrink-0' />
                  <span className='text-indigo-500 text-xs font-semibold'>Now</span>
                  <div className='flex-1 h-px bg-indigo-400/40' />
                  <span className='text-indigo-500 text-xs font-semibold'>{nowLabel}</span>
                </div>
              )
            }

            return rows
          })()}
        </div>
      )}

      </div>
    </div>
  )
}
