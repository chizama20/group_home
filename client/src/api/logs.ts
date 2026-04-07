import api from './client'
import type { ApiResponse } from '../types/api'
import type { IposLog, IposEntry, IposReviewComment, VitalsLog, DayProgramLog, BehavioralLog, ShiftNote, Announcement, Shift } from '../types/log'

// IPOS — list
export const getHomeIposLogs = (homeId: string, params?: { date?: string; status?: string; resident_id?: string }) =>
  api.get<ApiResponse<IposLog[]>>(`/homes/${homeId}/ipos-logs`, { params })

export const getResidentIpos = (residentId: string) =>
  api.get<ApiResponse<IposLog[]>>(`/residents/${residentId}/ipos-logs`)

export const getIposLog = (logId: string) =>
  api.get<ApiResponse<{ log: IposLog; entries: IposEntry[]; comments: IposReviewComment[] }>>(`/ipos-logs/${logId}`)

// IPOS — contribute
export const contributeIposEntry = (residentId: string, data: {
  shift: Shift
  goal_id?: string
  task_id_code?: string
  cls_minutes?: number
  pc_minutes?: number
  progress_code?: string
  narrative?: string
}) =>
  api.post<ApiResponse<{ log_id: string; entry_id: string }>>(`/residents/${residentId}/ipos-logs`, data)

// IPOS — entry edit
export const editIposEntry = (entryId: string, data: Partial<Pick<IposEntry, 'task_id_code' | 'cls_minutes' | 'pc_minutes' | 'progress_code' | 'narrative' | 'goal_id'>>) =>
  api.patch<ApiResponse<{ message: string }>>(`/ipos-entries/${entryId}`, data)

// IPOS — workflow
export const submitIposLog = (logId: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/ipos-logs/${logId}/submit`)

export const approveIposLog = (logId: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/ipos-logs/${logId}/approve`)

export const addReviewComment = (logId: string, data: { content: string; entry_id?: string }) =>
  api.post<ApiResponse<{ id: string }>>(`/ipos-logs/${logId}/comments`, data)

// IPOS — manager review queue
export const getReviewQueue = (homeId: string) =>
  api.get<ApiResponse<(IposLog & { entry_count: number; staff_names: string; shifts_covered: string; days_remaining: number })[]>>(`/homes/${homeId}/ipos-logs/review-queue`)

// Behavioral logs
export const getHomeBehavioralLogs = (homeId: string) =>
  api.get<ApiResponse<BehavioralLog[]>>(`/homes/${homeId}/behavioral-logs`)

export const getResidentBehavioralLogs = (residentId: string) =>
  api.get<ApiResponse<BehavioralLog[]>>(`/residents/${residentId}/behavioral-logs`)

export const createBehavioralLog = (homeId: string, data: { resident_id: string; behavior_id: string; notes?: string; occurred_at: string }) =>
  api.post<ApiResponse<{ id: string }>>(`/homes/${homeId}/behavioral-logs`, data)

// Shift notes
export const getShiftNotes = (homeId: string, params?: { shift?: Shift; date?: string }) =>
  api.get<ApiResponse<ShiftNote[]>>(`/homes/${homeId}/shift-notes`, { params })

export const createShiftNote = (homeId: string, data: Omit<ShiftNote, 'id' | 'home_id' | 'user_id' | 'created_at'>) =>
  api.post<ApiResponse<{ id: string }>>(`/homes/${homeId}/shift-notes`, data)

// Announcements
export const getAnnouncements = (homeId: string) =>
  api.get<ApiResponse<Announcement[]>>(`/homes/${homeId}/announcements`)

export const createAnnouncement = (orgId: string, data: { title: string; body: string; home_id?: string; is_pinned?: boolean }) =>
  api.post<ApiResponse<{ id: string }>>(`/orgs/${orgId}/announcements`, data)

// Vitals logs
export const getVitalsLogs = (residentId: string, params?: { vital_type?: string; from?: string; to?: string }) =>
  api.get<ApiResponse<VitalsLog[]>>(`/residents/${residentId}/vitals`, { params })

export const logVital = (residentId: string, data: {
  vital_type: string
  value_primary: number
  value_secondary?: number
  unit?: string
  meal_timing?: string
  notes?: string
}) =>
  api.post<ApiResponse<{ id: string; is_flagged: boolean }>>(`/residents/${residentId}/vitals`, data)

export const acknowledgeVital = (vitalsLogId: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/vitals-logs/${vitalsLogId}/acknowledge`)

// Day program logs
export const getDayProgramLogs = (residentId: string) =>
  api.get<ApiResponse<DayProgramLog[]>>(`/residents/${residentId}/day-program-logs`)

export const logDeparture = (residentId: string, data: {
  program_name: string
  program_address?: string
  transport_staff?: string
  transport_method?: string
  departed_at?: string
}) =>
  api.post<ApiResponse<{ id: string }>>(`/residents/${residentId}/day-program-logs`, data)

export const logReturn = (logId: string, data: { returned_at?: string; return_notes?: string }) =>
  api.patch<ApiResponse<{ message: string }>>(`/day-program-logs/${logId}/return`, data)
