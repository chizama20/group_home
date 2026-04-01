import api from './client'
import type { ApiResponse } from '../types/api'
import type { Shift, Announcement } from '../types/log'
import type { Resident } from '../types/resident'
import type { Appointment } from '../types/appointment'
import type { Task } from '../types/task'
import type { Incident } from '../types/incident'

export interface Home {
  id: string
  org_id: string
  name: string
  address: string | null
  is_active: boolean
  facility_type?: string
  created_at: string
}

export interface RosterEntry {
  id: string
  home_id: string
  user_id: string
  shift: Shift
  shift_date: string
  clocked_in_at: string | null
  clocked_out_at: string | null
}

export interface HomeStaffMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

export interface IposComplianceShift {
  shift: Shift
  total_residents: number
  filed_count: number
  pending_residents: { id: string; first_name: string; last_name: string }[]
}

// ── Homes ────────────────────────────────────────────────────────────────────

export const getHomes = () =>
  api.get<ApiResponse<Home[]>>('/homes')

export const createHome = (data: { name: string; address?: string }) =>
  api.post<ApiResponse<{ id: string; name: string }>>('/homes', data)

export const updateHome = (homeId: string, data: { name?: string; address?: string }) =>
  api.patch<ApiResponse<{ message: string }>>(`/homes/${homeId}`, data)

export const archiveHome = (homeId: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/homes/${homeId}/archive`)

// ── Staff ────────────────────────────────────────────────────────────────────

export const getHomeStaff = (homeId: string) =>
  api.get<ApiResponse<HomeStaffMember[]>>(`/homes/${homeId}/staff`)

export const addStaff = (homeId: string, userId: string) =>
  api.post<ApiResponse<{ message: string }>>(`/homes/${homeId}/staff`, { userId })

export const removeStaff = (homeId: string, userId: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/homes/${homeId}/staff/${userId}`)

// ── Roster ───────────────────────────────────────────────────────────────────

export const getHomeRoster = (homeId: string, params?: { shift?: string; date?: string }) =>
  api.get<ApiResponse<RosterEntry[]>>(`/homes/${homeId}/roster`, { params })

export const addRosterEntry = (homeId: string, data: { user_id: string; shift: Shift; shift_date: string }) =>
  api.post<ApiResponse<{ message: string }>>(`/homes/${homeId}/roster`, data)

export const removeRosterEntry = (homeId: string, entryId: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/homes/${homeId}/roster/${entryId}`)

export const clockIn = (homeId: string, data: { shift: Shift; shift_date: string }) =>
  api.post<ApiResponse<{ message: string }>>(`/homes/${homeId}/roster/clockin`, data)

export const clockOut = (homeId: string, data: { shift: Shift; shift_date: string }) =>
  api.post<ApiResponse<{ message: string }>>(`/homes/${homeId}/roster/clockout`, data)

// ── IPOS compliance ──────────────────────────────────────────────────────────

export const getIposCompliance = (homeId: string, date?: string) =>
  api.get<ApiResponse<IposComplianceShift[]>>(`/homes/${homeId}/ipos/compliance`, { params: date ? { date } : undefined })

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  residentCount:    number
  overdueMedCount:  number
  unfiledIposCount: number
  openIncidentCount: number
  staffOnShiftCount: number
  isShiftActive:    boolean
}

export interface DashboardPayload {
  announcements: Announcement[]
  residents:     Resident[]
  appointments:  Appointment[]
  tasks:         Task[]
  roster:        RosterEntry[]
  openIncidents: Incident[]
  stats:         DashboardStats
}

export const getHomeDashboard = (homeId: string, params?: { shift?: string; date?: string }) =>
  api.get<ApiResponse<DashboardPayload>>(`/homes/${homeId}/dashboard`, { params })
