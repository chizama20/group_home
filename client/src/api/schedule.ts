import api from './client'
import type { ApiResponse } from '../types/api'
import type { WeekSchedule, ShiftSlot, ScheduleRequest, ShiftType, RequestStatus } from '../types/schedule'

// ── Schedule ─────────────────────────────────────────────────────────────────

export const getHomeSchedule = (homeId: string, weekStart: string) =>
  api.get<ApiResponse<WeekSchedule>>(`/homes/${homeId}/schedule`, { params: { week_start: weekStart } })

export const createShiftSlot = (homeId: string, data: { user_id: string; date: string; shift_type: ShiftType }) =>
  api.post<ApiResponse<ShiftSlot>>(`/homes/${homeId}/schedule/slots`, data)

export const deleteShiftSlot = (homeId: string, slotId: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/homes/${homeId}/schedule/slots/${slotId}`)

// ── Time-off Requests ────────────────────────────────────────────────────────

export const getScheduleRequests = (homeId: string) =>
  api.get<ApiResponse<ScheduleRequest[]>>(`/homes/${homeId}/schedule/requests`)

export const reviewScheduleRequest = (
  homeId: string,
  requestId: string,
  data: { status: Exclude<RequestStatus, 'pending'> }
) =>
  api.patch<ApiResponse<{ message: string }>>(`/homes/${homeId}/schedule/requests/${requestId}`, data)
