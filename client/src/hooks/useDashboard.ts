import { useState, useEffect, useCallback } from 'react'
import { getHomeDashboard } from '../api/homes'
import { currentShift } from '../types/log'
import { todayStr } from '../utils/date'
import type { Announcement } from '../types/log'
import type { Appointment } from '../types/appointment'
import type { Task } from '../types/task'
import type { Resident } from '../types/resident'

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
  const [announcements,     setAnnouncements]     = useState<Announcement[]>([])
  const [appointments,      setAppointments]      = useState<Appointment[]>([])
  const [tasks,             setTasks]             = useState<Task[]>([])
  const [residents,         setResidents]         = useState<Resident[]>([])
  const [overdueMedCount,   setOverdueMedCount]   = useState(0)
  const [unfiledIposCount,  setUnfiledIposCount]  = useState(0)
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

    getHomeDashboard(homeId, { shift: currentShift(), date: todayStr() })
      .then(res => {
        if (!res.data.success || !res.data.data) return
        const d = res.data.data
        setAnnouncements((d.announcements as Announcement[]) ?? [])
        setAppointments((d.appointments as Appointment[]) ?? [])
        setTasks((d.tasks as Task[]) ?? [])
        setResidents((d.residents as Resident[]) ?? [])
        setOverdueMedCount(d.stats.overdueMedCount)
        setUnfiledIposCount(d.stats.unfiledIposCount)
        setOpenIncidentCount(d.stats.openIncidentCount)
        setStaffOnShiftCount(d.stats.staffOnShiftCount)
        setIsShiftActive(d.stats.isShiftActive)
      })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setIsLoading(false))
  }, [homeId, tick])

  return {
    announcements, appointments, tasks, residents,
    overdueMedCount, unfiledIposCount, openIncidentCount, staffOnShiftCount,
    isShiftActive, isLoading, error, refresh,
  }
}
