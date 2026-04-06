import React, { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useHome } from '../../context/HomeContext'
import { useRole } from '../../utils/role'
import { useResidents } from '../../hooks/useResidents'
import { getHomeMedications, bulkAdminister } from '../../api/medications'
import { getHomeAppointments } from '../../api/appointments'
import AddAppointmentForm from '../../components/AddAppointmentForm'
import type { Medication, MedicationOutcome } from '../../types/medication'
import type { Appointment } from '../../types/appointment'
import { todayStr } from '../../utils/date'
import { cn } from '../../lib/cn'

// ── Types ──────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'meds' | 'appointments'

interface MedRound {
  kind: 'med'
  time: string
  displayTime: string
  displayAmPm: string
  medications: Medication[]
  residents: ResidentSummary[]
  isDone: boolean
  isDueSoon: boolean
  isActive: boolean
  isLocked: boolean
  sortKey: number
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
  const isPast  = selectedDate < today

  const slotMap = new Map<string, Medication[]>()
  for (const med of meds) {
    if (!med.is_active) continue
    const slot = med.scheduled_time ? med.scheduled_time.slice(0, 5) : 'Unscheduled'
    if (!slotMap.has(slot)) slotMap.set(slot, [])
    slotMap.get(slot)!.push(med)
  }

  const rounds: MedRound[] = []
  for (const [slot, slotMeds] of slotMap.entries()) {
    if (slot === 'Unscheduled') continue

    const slotMins = parseHHMM(slot)
    const diffMins = slotMins - nowMinutes()

    let isDone = false, isDueSoon = false, isActive = false, isLocked = false
    if (isPast) {
      isDone = true
    } else if (isToday) {
      if (diffMins <= 0)       isActive  = true
      else if (diffMins <= 30) isDueSoon = true
      else                     isLocked  = true
    } else {
      isLocked = true
    }

    const residentMap = new Map<string, ResidentSummary>()
    for (const med of slotMeds) {
      if (!residentMap.has(med.resident_id)) {
        const name = med.first_name && med.last_name
          ? `${med.first_name} ${med.last_name}` : med.resident_id
        const initials = med.first_name && med.last_name
          ? `${med.first_name[0]}${med.last_name[0]}`.toUpperCase()
          : med.resident_id.slice(0, 2).toUpperCase()
        residentMap.set(med.resident_id, { id: med.resident_id, initials, name })
      }
    }

    const { display, ampm } = formatDisplayTime(slot)
    rounds.push({
      kind: 'med', time: slot, displayTime: display, displayAmPm: ampm,
      medications: slotMeds, residents: [...residentMap.values()],
      isDone, isDueSoon, isActive, isLocked, sortKey: slotMins,
    })
  }

  return rounds.sort((a, b) => a.sortKey - b.sortKey)
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

// ── Administer Sheet ───────────────────────────────────────────────────────────

const OUTCOMES: { value: MedicationOutcome; label: string; active: string }[] = [
  { value: 'given',   label: 'Given',   active: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'refused', label: 'Refused', active: 'bg-red-500 text-white border-red-500' },
  { value: 'missed',  label: 'Missed',  active: 'bg-zinc-500 text-white border-zinc-500' },
  { value: 'held',    label: 'Held',    active: 'bg-indigo-500 text-white border-indigo-500' },
]

function AdministerSheet({ round, onClose, onDone }: {
  round: MedRound
  onClose: () => void
  onDone:  () => void
}) {
  const [outcomes, setOutcomes] = useState<Record<string, MedicationOutcome>>(
    () => Object.fromEntries(round.medications.map(m => [m.id, 'given' as MedicationOutcome]))
  )
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      // Group by outcome then bulk-submit each group
      const groups = new Map<MedicationOutcome, string[]>()
      for (const [id, outcome] of Object.entries(outcomes)) {
        const arr = groups.get(outcome as MedicationOutcome) ?? []
        arr.push(id)
        groups.set(outcome as MedicationOutcome, arr)
      }
      for (const [outcome, ids] of groups.entries())
        await bulkAdminister({ medication_ids: ids, outcome })
      onDone()
    } catch {
      setError('Failed to record. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onClose} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-xl md:rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 max-h-[85vh] overflow-y-auto pb-8'>
        <div className='flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800'>
          <div>
            <h2 className='text-base font-bold text-zinc-900 dark:text-white'>
              {round.displayTime} {round.displayAmPm} Round
            </h2>
            <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
              {round.medications.length} medication{round.medications.length !== 1 ? 's' : ''} — select outcome for each
            </p>
          </div>
          <button onClick={onClose} className='w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'>
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='divide-y divide-zinc-100 dark:divide-zinc-800'>
          {round.medications.map(med => {
            const residentName = round.residents.find(r => r.id === med.resident_id)?.name ?? 'Resident'
            const current = outcomes[med.id] ?? 'given'
            return (
              <div key={med.id} className='px-4 py-3'>
                <p className='text-sm font-semibold text-zinc-900 dark:text-white mb-0.5'>{med.name}</p>
                <p className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>{med.dosage} · {residentName}</p>
                <div className='flex gap-1.5'>
                  {OUTCOMES.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setOutcomes(prev => ({ ...prev, [med.id]: o.value }))}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                        current === o.value
                          ? o.active
                          : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <p className='mx-4 mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg'>
            {error}
          </p>
        )}

        <div className='px-4 mt-4'>
          <button
            disabled={submitting}
            onClick={() => { void handleSubmit() }}
            className='w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 transition-colors'
          >
            {submitting ? 'Recording…' : 'Record all'}
          </button>
        </div>
      </div>
    </>
  )
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

function MedRoundCard({ round, onAdminister }: { round: MedRound; onAdminister: () => void }) {
  const total = round.medications.length

  if (round.isDone) {
    return (
      <div className='opacity-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5'>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{round.displayTime} {round.displayAmPm} Round</p>
            <p className='text-xs text-zinc-400 mt-0.5'>{total} medication{total !== 1 ? 's' : ''}</p>
          </div>
          <span className='bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0'>Done</span>
        </div>
        <div className='mt-2 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden'>
          <div className='h-full bg-emerald-500 rounded-full w-full' />
        </div>
        <p className='text-xs text-zinc-400 mt-1'>{total}/{total} given</p>
      </div>
    )
  }

  if (round.isLocked) {
    return (
      <div className='bg-white/60 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/50 rounded-xl p-3.5 opacity-50'>
        <div className='flex items-center gap-2'>
          <svg className='w-3.5 h-3.5 text-zinc-400 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
            <rect x='3' y='11' width='18' height='11' rx='2' ry='2' /><path d='M7 11V7a5 5 0 0 1 10 0v4' />
          </svg>
          <p className='text-sm font-semibold text-zinc-400'>{round.displayTime} {round.displayAmPm} Round</p>
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
          <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{round.displayTime} {round.displayAmPm} Round</p>
          <p className='text-xs text-zinc-400 mt-0.5'>{total} medication{total !== 1 ? 's' : ''}</p>
        </div>
        <span className='bg-amber-500/10 text-amber-500 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0'>
          {round.isDueSoon ? 'Due soon' : 'Active'}
        </span>
      </div>

      {round.residents.length > 0 && (
        <div className='flex mt-2.5'>
          {round.residents.slice(0, 5).map((r, idx) => (
            <div key={r.id} title={r.name}
              className={cn('w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold flex items-center justify-center border border-white dark:border-zinc-900 shrink-0', idx > 0 && '-ml-1.5')}>
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

      <button type='button' onClick={onAdminister}
        className='bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-lg min-h-[36px] mt-2 w-full hover:bg-indigo-700 transition-colors'>
        Administer
      </button>
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

function DotColor({ event }: { event: TimelineEvent }): React.JSX.Element {
  if (event.kind === 'appt') return <div className='w-2.5 h-2.5 rounded-full mt-3 shrink-0 bg-violet-400' />
  const r = event as MedRound
  if (r.isDone)                return <div className='w-2.5 h-2.5 rounded-full mt-3 shrink-0 bg-emerald-400' />
  if (r.isDueSoon || r.isActive) return <div className='w-2.5 h-2.5 rounded-full mt-3 shrink-0 bg-amber-400' />
  return <div className='w-2.5 h-2.5 rounded-full mt-3 shrink-0 bg-zinc-300 dark:bg-zinc-700' />
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { homeId }               = useHome()
  const { residents }            = useResidents(homeId)
  const { isManagerOrAbove }     = useRole()

  const today = todayStr()

  const [selectedDate,  setSelectedDate]  = useState<string>(today)
  const [viewMonth,     setViewMonth]     = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [activeFilter,  setActiveFilter]  = useState<FilterType>('all')
  const [medications,   setMedications]   = useState<Medication[]>([])
  const [appointments,  setAppointments]  = useState<Appointment[]>([])
  const [medsLoading,   setMedsLoading]   = useState(false)
  const [apptsLoading,  setApptsLoading]  = useState(false)
  const [showAddAppt,   setShowAddAppt]   = useState(false)
  const [adminRound,    setAdminRound]    = useState<MedRound | null>(null)
  const [medsKey,       setMedsKey]       = useState(0)
  const [apptsKey,      setApptsKey]      = useState(0)

  // Medications: fetch once per homeId (scheduled_time is static per home)
  useEffect(() => {
    if (!homeId) return
    setMedsLoading(true)
    getHomeMedications(homeId)
      .then(res => setMedications(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setMedsLoading(false))
  }, [homeId, medsKey])

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
    const map = new Map<string, { meds: boolean; appts: boolean }>()
    const hasMeds = medications.some(m => m.is_active && m.scheduled_time)
    for (const cell of monthCells) {
      if (cell) map.set(cell, { meds: hasMeds, appts: false })
    }
    for (const appt of appointments) {
      const d = appt.appointment_date.slice(0, 10)
      const existing = map.get(d)
      if (existing) map.set(d, { ...existing, appts: true })
    }
    return map
  }, [medications, appointments, monthCells])

  // Timeline for selected date
  const medRounds  = useMemo(() => buildMedRounds(medications, selectedDate),  [medications, selectedDate])
  const apptEvents = useMemo(() => buildApptEvents(appointments, selectedDate), [appointments, selectedDate])

  const allEvents = useMemo<TimelineEvent[]>(() => {
    const base: TimelineEvent[] = [
      ...(activeFilter !== 'appointments' ? medRounds  : []),
      ...(activeFilter !== 'meds'         ? apptEvents : []),
    ]
    return base.sort((a, b) => a.sortKey - b.sortKey)
  }, [medRounds, apptEvents, activeFilter])

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

  const loading = medsLoading || apptsLoading

  return (
    <div className='pb-8 min-h-screen bg-zinc-50 dark:bg-black'>
      <div className='max-w-4xl mx-auto'>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className='px-4 pt-5 pb-3 flex items-center justify-between'>
          <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Schedule</h1>
          <div className='flex items-center gap-2'>
            <button
              onClick={goToday}
              className='text-xs font-semibold px-3 py-1.5 rounded-full min-h-[32px] bg-indigo-600 text-white hover:bg-indigo-700 transition-colors'
            >
              Today
            </button>
            {isManagerOrAbove && homeId && (
              <button
                onClick={() => setShowAddAppt(true)}
                className='w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center hover:bg-indigo-700 transition-colors'
                aria-label='Add appointment'
              >
                <Plus className='w-4 h-4 text-white' />
              </button>
            )}
          </div>
        </div>

        {/* ── Month Grid ───────────────────────────────────────────────── */}
        <div className='mx-4 mb-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden'>
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
                    'flex flex-col items-center justify-center h-14 rounded-xl text-sm transition-colors',
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  )}
                >
                  <span className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium',
                    isSelected   ? 'text-white' :
                    isTodayCell  ? 'text-indigo-600 dark:text-indigo-400 font-bold ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-zinc-900' :
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
                  {dots && (dots.meds || dots.appts) && (
                    <div className={cn('gap-0.5 mt-0.5', firstAppt ? 'hidden md:flex' : 'flex')}>
                      {dots.meds  && <div className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-white/70' : 'bg-amber-400')} />}
                      {dots.appts && <div className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-white/70' : 'bg-violet-400')} />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Selected day + Filter ─────────────────────────────────────── */}
        <div className='px-4 mb-3 flex items-center justify-between gap-2'>
          <p className='text-sm font-semibold text-zinc-900 dark:text-white truncate'>{selectedLabel}</p>
          <div className='flex gap-1.5 shrink-0'>
            {(['all', 'meds', 'appointments'] as FilterType[]).map(f => {
              const label = f === 'all' ? 'All' : f === 'meds' ? 'Meds' : 'Appts'
              return (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors',
                    activeFilter === f
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
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
                      <div className='w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-500/25 shrink-0' />
                      <span className='text-indigo-500 text-xs font-semibold'>Now</span>
                      <div className='flex-1 h-px bg-indigo-400/40' />
                      <span className='text-indigo-500 text-xs font-semibold'>{nowLabel}</span>
                    </div>
                  )
                }

                const showTime = event.time !== lastTime
                if (showTime) lastTime = event.time

                const key = event.kind === 'med' ? `med-${event.time}` : `appt-${event.appointment.id}`
                rows.push(
                  <div key={key} className='flex'>
                    <div className='w-[52px] text-right pt-3 pr-3 shrink-0'>
                      {showTime && (
                        <>
                          <p className='text-[11px] text-zinc-400 dark:text-zinc-600 leading-none'>{event.displayTime}</p>
                          <p className='text-[11px] text-zinc-500 leading-none mt-0.5'>{event.displayAmPm}</p>
                        </>
                      )}
                    </div>
                    <div className='w-4 flex flex-col items-center shrink-0'>
                      <DotColor event={event} />
                      {idx < allEvents.length - 1 && (
                        <div className='flex-1 w-px bg-zinc-200 dark:bg-zinc-800 mt-1' />
                      )}
                    </div>
                    <div className='flex-1 pb-3 pl-1'>
                      {event.kind === 'med' ? (
                        <MedRoundCard round={event as MedRound} onAdminister={() => setAdminRound(event as MedRound)} />
                      ) : (
                        <AppointmentCard event={event as ApptEvent} />
                      )}
                    </div>
                  </div>
                )
              })

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

      {/* ── Sheets ─────────────────────────────────────────────────────── */}
      {showAddAppt && homeId && (
        <AddAppointmentForm
          homeId={homeId}
          residents={residents}
          onSuccess={() => { setShowAddAppt(false); setApptsKey(k => k + 1) }}
          onCancel={() => setShowAddAppt(false)}
        />
      )}

      {adminRound && (
        <AdministerSheet
          round={adminRound}
          onClose={() => setAdminRound(null)}
          onDone={() => { setAdminRound(null); setMedsKey(k => k + 1) }}
        />
      )}
    </div>
  )
}
