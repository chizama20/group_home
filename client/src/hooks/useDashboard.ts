import { useState, useEffect, useCallback } from 'react'
import { getAnnouncements, getHomeIpos } from '../api/logs'
import { getHomeAppointments } from '../api/appointments'
import { getHomeTasks } from '../api/tasks'
import { getResidents } from '../api/residents'
import { getHomeMedications } from '../api/medications'
import { getHomeRoster } from '../api/homes'
import { getHomeIncidents } from '../api/incidents'
import type { RosterEntry } from '../api/homes'
import { currentShift } from '../types/log'
import { todayStr } from '../utils/date'
import type { Announcement, IposLog } from '../types/log'
import type { Appointment } from '../types/appointment'
import type { Task } from '../types/task'
import type { Resident } from '../types/resident'
import type { Medication } from '../types/medication'

function currentHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function countOverdueMeds(meds: Medication[]): number {
  const t = currentHHMM()
  return meds.filter(m => m.is_active && m.scheduled_time !== null && m.scheduled_time.slice(0, 5) <= t).length
}

function countUnfiledIpos(residents: Resident[], logs: IposLog[]): number {
  const filed = new Set(logs.map(l => l.resident_id))
  return residents.filter(r => r.is_active && !filed.has(r.id)).length
}

function shiftIsActive(roster: RosterEntry[]): boolean {
  return roster.some(r => r.clocked_in_at && !r.clocked_out_at)
}

function countStaffOnShift(roster: RosterEntry[]): number {
  return roster.filter(r => r.clocked_in_at && !r.clocked_out_at).length
}

interface DashboardData {
  announcements:     Announcement[]
  appointments:      Appointment[]
  tasks:             Task[]
  residents:         Resident[]
  overdueMedCount:   number
  unfiledIposCount:  number
  openIncidentCount: number
  staffOnShiftCount: number
  isShiftActive:     boolean
  isLoading:         boolean
  error:             string | null
  refresh:           () => void
}

export function useDashboard(homeId: string | null): DashboardData {
  const [announcements,    setAnnouncements]    = useState<Announcement[]>([])
  const [appointments,     setAppointments]     = useState<Appointment[]>([])
  const [tasks,            setTasks]            = useState<Task[]>([])
  const [residents,        setResidents]        = useState<Resident[]>([])
  const [overdueMedCount,  setOverdueMedCount]  = useState(0)
  const [unfiledIposCount, setUnfiledIposCount] = useState(0)
  const [openIncidentCount, setOpenIncidentCount] = useState(0)
  const [staffOnShiftCount, setStaffOnShiftCount] = useState(0)
  const [isShiftActive,     setIsShiftActive]     = useState(false)
  const [isLoading,         setIsLoading]         = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [tick,              setTick]              = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!homeId) return
    setIsLoading(true)
    setError(null)

    const shift = currentShift()
    const date  = todayStr()

    void Promise.allSettled([
      getAnnouncements(homeId),
      getHomeAppointments(homeId, { from: 'today', days: 2 }),
      getHomeTasks(homeId),
      getResidents(homeId),
      getHomeMedications(homeId),
      getHomeIpos(homeId, { date, shift }),
      getHomeRoster(homeId, { shift, date }),
      getHomeIncidents(homeId, { status: 'open' }),
    ]).then(([ann, appt, tsks, res, meds, ipos, roster, incidents]) => {
      if (ann.status   === 'fulfilled' && ann.value.data.success)
        setAnnouncements(ann.value.data.data ?? [])
      if (appt.status  === 'fulfilled' && appt.value.data.success)
        setAppointments(appt.value.data.data ?? [])
      if (tsks.status  === 'fulfilled' && tsks.value.data.success)
        setTasks(tsks.value.data.data ?? [])
      if (res.status   === 'fulfilled' && res.value.data.success) {
        const r = res.value.data.data ?? []
        setResidents(r)
        if (ipos.status === 'fulfilled' && ipos.value.data.success)
          setUnfiledIposCount(countUnfiledIpos(r, ipos.value.data.data ?? []))
      }
      if (meds.status     === 'fulfilled' && meds.value.data.success)
        setOverdueMedCount(countOverdueMeds(meds.value.data.data ?? []))
      if (roster.status   === 'fulfilled' && roster.value.data.success) {
        const r = roster.value.data.data ?? []
        setIsShiftActive(shiftIsActive(r))
        setStaffOnShiftCount(countStaffOnShift(r))
      }
      if (incidents.status === 'fulfilled' && incidents.value.data.success)
        setOpenIncidentCount(incidents.value.data.data?.length ?? 0)
    }).finally(() => setIsLoading(false))
  }, [homeId, tick])

  return {
    announcements, appointments, tasks, residents,
    overdueMedCount, unfiledIposCount, openIncidentCount, staffOnShiftCount,
    isShiftActive, isLoading, error, refresh,
  }
}
