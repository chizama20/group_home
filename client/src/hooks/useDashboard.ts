import { useState, useEffect, useCallback } from 'react'
import { getAnnouncements, getHomeIposLogs } from '../api/logs'
import { getHomeAppointments } from '../api/appointments'
import { getResidents } from '../api/residents'
import { getHomeRoster } from '../api/homes'
import type { RosterEntry } from '../api/homes'
import { currentShift } from '../types/log'
import { todayStr } from '../utils/date'
import type { Announcement, IposLog } from '../types/log'
import type { Appointment } from '../types/appointment'
import type { Resident } from '../types/resident'

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
  residents:         Resident[]
  unfiledIposCount:  number
  staffOnShiftCount: number
  isShiftActive:     boolean
  isLoading:         boolean
  error:             string | null
  refresh:           () => void
}

export function useDashboard(homeId: string | null): DashboardData {
  const [announcements,    setAnnouncements]    = useState<Announcement[]>([])
  const [appointments,     setAppointments]     = useState<Appointment[]>([])
  const [residents,        setResidents]        = useState<Resident[]>([])
  const [unfiledIposCount, setUnfiledIposCount] = useState(0)
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
      getResidents(homeId),
      getHomeIposLogs(homeId, { date }),
      getHomeRoster(homeId, { shift, date }),
    ]).then(([ann, appt, res, ipos, roster]) => {
      if (ann.status   === 'fulfilled' && ann.value.data.success)
        setAnnouncements(ann.value.data.data ?? [])
      if (appt.status  === 'fulfilled' && appt.value.data.success)
        setAppointments(appt.value.data.data ?? [])
      if (res.status   === 'fulfilled' && res.value.data.success) {
        const r = res.value.data.data ?? []
        setResidents(r)
        if (ipos.status === 'fulfilled' && ipos.value.data.success)
          setUnfiledIposCount(countUnfiledIpos(r, ipos.value.data.data ?? []))
      }
      if (roster.status   === 'fulfilled' && roster.value.data.success) {
        const r = roster.value.data.data ?? []
        setIsShiftActive(shiftIsActive(r))
        setStaffOnShiftCount(countStaffOnShift(r))
      }
    }).finally(() => setIsLoading(false))
  }, [homeId, tick])

  return {
    announcements, appointments, residents,
    unfiledIposCount, staffOnShiftCount,
    isShiftActive, isLoading, error, refresh,
  }
}
