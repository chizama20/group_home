import React, { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useHome } from '../../context/HomeContext'
import { useRole } from '../../utils/role'
import { useResidents } from '../../hooks/useResidents'
import { getHomeAppointments } from '../../api/appointments'
import AddAppointmentForm from '../../components/AddAppointmentForm'
import type { Appointment } from '../../types/appointment'
import { todayStr } from '../../utils/date'
import { cn } from '../../lib/cn'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ApptEvent {
  kind: 'appt'
  time: string
  displayTime: string
  displayAmPm: string
  appointment: Appointment
  isPast: boolean
  sortKey: number
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

function buildApptEvents(appointments: Appointment[], selectedDate: string): ApptEvent[] {
  const today = todayStr()
  return appointments
    .filter(a => a.appointment_date.slice(0, 10) === selectedDate)
    .map(a => {
      const timeStr  = a.appointment_time ? a.appointment_time.slice(0, 5) : '00:00'
      const slotMins = parseHHMM(timeStr)
      const isPast   = selectedDate < today || (selectedDate === today && slotMins < nowMinutes())
      const { display, ampm } = formatDisplayTime(timeStr)
      return { kind: 'appt' as const, time: timeStr, displayTime: display, displayAmPm: ampm, appointment: a, isPast, sortKey: slotMins }
    })
    .sort((a, b) => a.sortKey - b.sortKey)
}

function appointmentTypeColors(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('gp') || t.includes('doctor') || t.includes('medical')) return 'bg-violet-500/15 text-violet-400'
  if (t.includes('therapy') || t.includes('counsell'))                    return 'bg-cyan-500/15 text-cyan-400'
  if (t.includes('pickup') || t.includes('transport'))                    return 'bg-amber-500/15 text-amber-400'
  return 'bg-zinc-500/15 text-zinc-400'
}

// Month grid: returns YYYY-MM-DD strings (or null for padding cells)
function getMonthGrid(year: number, month: number): (string | null)[] {
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// ── Timeline sub-components ────────────────────────────────────────────────────

function TimelineSkeletons() {
  return (
    <div className='px-4 space-y-4'>
      {[...Array(3)].map((_, i) => (
        <div key={i} className='flex animate-pulse'>
          <div className='w-[52px] pt-3 pr-3 shrink-0'>
            <div className='h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-8 ml-auto' />
          </div>
          <div className='w-4 flex flex-col items-center shrink-0'>
            <div className='w-2.5 h-2.5 rounded-full mt-3 bg-zinc-200 dark:bg-zinc-800 shrink-0' />
            <div className='flex-1 w-px bg-zinc-200 dark:bg-zinc-800 mt-1' />
          </div>
          <div className='flex-1 pb-3 pl-1'>
            <div className='bg-zinc-100 dark:bg-zinc-800 rounded-xl h-[72px]' />
          </div>
        </div>
      ))}
    </div>
  )
}

function AppointmentCard({ event }: { event: ApptEvent }) {
  const appt = event.appointment
  const typeLabel = appt.type.charAt(0).toUpperCase() + appt.type.slice(1).replace(/_/g, ' ')
  return (
    <div className={cn('bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5', event.isPast && 'opacity-65')}>
      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mb-2', appointmentTypeColors(appt.type))}>
        {typeLabel}
      </span>
      <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{appt.title}</p>
      {appt.location && <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>{appt.location}</p>}
      <div className='flex gap-3 mt-1.5 text-xs text-zinc-400'>
        <span>{event.displayTime} {event.displayAmPm}</span>
        {appt.collector_name && <span>Escorted by {appt.collector_name}</span>}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { homeId }               = useHome()
  const { residents }            = useResidents(homeId)
  const { isAdmin }              = useRole()

  const today = todayStr()

  const [selectedDate,  setSelectedDate]  = useState<string>(today)
  const [viewMonth,     setViewMonth]     = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [appointments,  setAppointments]  = useState<Appointment[]>([])
  const [apptsLoading,  setApptsLoading]  = useState(false)
  const [showAddAppt,   setShowAddAppt]   = useState(false)
  const [apptsKey,      setApptsKey]      = useState(0)

  // Appointments: fetch for the visible month whenever homeId or month changes
  useEffect(() => {
    if (!homeId) return
    setApptsLoading(true)
    const year  = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const from  = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const days  = new Date(year, month + 1, 0).getDate()
    getHomeAppointments(homeId, { from, days })
      .then(res => setAppointments(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setApptsLoading(false))
  }, [homeId, viewMonth, apptsKey])

  // Month navigation
  function prevMonth() { setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }
  function goToday() {
    setSelectedDate(today)
    setViewMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  }

  // Selecting a date — if it's in a different month, update viewMonth too
  function selectDate(d: string) {
    setSelectedDate(d)
    const [y, m] = d.split('-').map(Number)
    if (y !== viewMonth.getFullYear() || (m - 1) !== viewMonth.getMonth())
      setViewMonth(new Date(y, m - 1, 1))
  }

  // Month grid
  const monthCells = useMemo(() => getMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth()), [viewMonth])
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Dots per date for the month grid
  const dotsMap = useMemo(() => {
    const map = new Map<string, { appts: boolean }>()
    for (const appt of appointments) {
      const d = appt.appointment_date.slice(0, 10)
      map.set(d, { appts: true })
    }
    return map
  }, [appointments])

  // Timeline for selected date
  const allEvents = useMemo(() => buildApptEvents(appointments, selectedDate), [appointments, selectedDate])

  // "Now" line
  const isToday   = selectedDate === today
  const nowMins   = nowMinutes()
  const nowH24    = Math.floor(nowMins / 60)
  const nowMin    = nowMins % 60
  const nowAmPm   = nowH24 < 12 ? 'AM' : 'PM'
  const nowH12    = nowH24 % 12 === 0 ? 12 : nowH24 % 12
  const nowLabel  = `${nowH12}:${String(nowMin).padStart(2, '0')} ${nowAmPm}`
  let nowInsertIdx = -1
  if (isToday) {
    nowInsertIdx = allEvents.findIndex(e => e.sortKey >= nowMins)
    if (nowInsertIdx === -1 && allEvents.length > 0) nowInsertIdx = allEvents.length
  }

  const selectedLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const loading = apptsLoading

  return (
    <div className='pb-8 min-h-screen bg-zinc-50 dark:bg-black'>
      <div className='max-w-4xl mx-auto'>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className='px-4 pt-5 pb-3 flex items-center justify-between'>
          <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Schedule</h1>
          <div className='flex items-center gap-2'>
            <button
              onClick={goToday}
              className='text-xs font-semibold px-3 py-1.5 rounded-full min-h-[32px] bg-primary text-white hover:bg-primary/90 transition-colors'
            >
              Today
            </button>
            {isAdmin && homeId && (
              <button
                onClick={() => setShowAddAppt(true)}
                className='w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors'
                aria-label='Add appointment'
              >
                <Plus className='w-4 h-4 text-white' />
              </button>
            )}
          </div>
        </div>

        {/* ── Month Grid ───────────────────────────────────────────────── */}
        <div className='mx-4 mb-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'>
          {/* Month nav row */}
          <div className='flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800'>
            <button onClick={prevMonth}
              className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors'>
              <ChevronLeft className='w-4 h-4' />
            </button>
            <span className='text-sm font-semibold text-zinc-900 dark:text-white'>{monthLabel}</span>
            <button onClick={nextMonth}
              className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors'>
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>

          {/* Weekday headers */}
          <div className='grid grid-cols-7 px-2 pt-2'>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className='text-center text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 pb-1'>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className='grid grid-cols-7 px-2 pb-3 gap-y-0.5'>
            {monthCells.map((cell, i) => {
              if (!cell) return <div key={`pad-${i}`} />
              const isSelected  = cell === selectedDate
              const isTodayCell = cell === today
              const dots        = dotsMap.get(cell)
              // Get appointments for this day for mobile display
              const dayAppts = appointments.filter(a => a.appointment_date.slice(0, 10) === cell)
              const firstAppt = dayAppts[0]
              return (
                <button key={cell} onClick={() => selectDate(cell)}
                  className={cn(
                    'flex flex-col items-center justify-center min-h-[112px] rounded-xl text-sm transition-colors',
                    isSelected
                      ? 'bg-primary text-white'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  )}
                >
                  <span className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium',
                    isSelected   ? 'text-white' :
                    isTodayCell  ? 'text-primary dark:text-primary font-bold ring-2 ring-primary ring-offset-1 dark:ring-offset-zinc-900' :
                                   'text-zinc-700 dark:text-zinc-300'
                  )}>
                    {new Date(cell + 'T00:00:00').getDate()}
                  </span>
                  {/* Show truncated event title on mobile, dots on larger screens */}
                  {firstAppt ? (
                    <p className={cn(
                      'text-[8px] leading-tight mt-0.5 w-full px-0.5 truncate text-center md:hidden',
                      isSelected ? 'text-white/80' : 'text-violet-500 dark:text-violet-400'
                    )}>
                      {firstAppt.title}
                    </p>
                  ) : null}
                  {dots?.appts && (
                    <div className={cn('gap-0.5 mt-0.5', firstAppt ? 'hidden md:flex' : 'flex')}>
                      <div className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-white/70' : 'bg-violet-400')} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Selected day ─────────────────────────────────────────────── */}
        <div className='px-4 mb-3'>
          <p className='text-sm font-semibold text-zinc-900 dark:text-white truncate'>{selectedLabel}</p>
        </div>

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        {loading ? (
          <TimelineSkeletons />
        ) : allEvents.length === 0 ? (
          <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center'>
            <p className='text-sm text-zinc-500 dark:text-zinc-400'>No events scheduled for this day.</p>
          </div>
        ) : (
          <div className='px-4'>
            {(() => {
              const rows: React.JSX.Element[] = []
              let lastTime = ''

              allEvents.forEach((event, idx) => {
                if (isToday && idx === nowInsertIdx) {
                  rows.push(
                    <div key='now-line' className='flex items-center gap-2 py-1 -mx-4 px-4'>
                      <div className='w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/25 shrink-0' />
                      <span className='text-primary text-xs font-semibold'>Now</span>
                      <div className='flex-1 h-px bg-primary/40' />
                      <span className='text-primary text-xs font-semibold'>{nowLabel}</span>
                    </div>
                  )
                }

                const showTime = event.time !== lastTime
                if (showTime) lastTime = event.time

                rows.push(
                  <div key={`appt-${event.appointment.id}`} className='flex'>
                    <div className='w-[52px] text-right pt-3 pr-3 shrink-0'>
                      {showTime && (
                        <>
                          <p className='text-[11px] text-zinc-400 dark:text-zinc-600 leading-none'>{event.displayTime}</p>
                          <p className='text-[11px] text-zinc-500 leading-none mt-0.5'>{event.displayAmPm}</p>
                        </>
                      )}
                    </div>
                    <div className='w-4 flex flex-col items-center shrink-0'>
                      <div className='w-2.5 h-2.5 rounded-full mt-3 shrink-0 bg-violet-400' />
                      {idx < allEvents.length - 1 && (
                        <div className='flex-1 w-px bg-zinc-200 dark:bg-zinc-800 mt-1' />
                      )}
                    </div>
                    <div className='flex-1 pb-3 pl-1'>
                      <AppointmentCard event={event} />
                    </div>
                  </div>
                )
              })

              if (isToday && nowInsertIdx === allEvents.length) {
                rows.push(
                  <div key='now-line-end' className='flex items-center gap-2 py-1 -mx-4 px-4'>
                    <div className='w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/25 shrink-0' />
                    <span className='text-primary text-xs font-semibold'>Now</span>
                    <div className='flex-1 h-px bg-primary/40' />
                    <span className='text-primary text-xs font-semibold'>{nowLabel}</span>
                  </div>
                )
              }

              return rows
            })()}
          </div>
        )}

      </div>

      {/* ── Sheets ─────────────────────────────────────────────────────── */}
      {showAddAppt && homeId && (
        <AddAppointmentForm
          homeId={homeId}
          residents={residents}
          onSuccess={() => { setShowAddAppt(false); setApptsKey(k => k + 1) }}
          onCancel={() => setShowAddAppt(false)}
        />
      )}
    </div>
  )
}
