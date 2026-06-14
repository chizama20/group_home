import api from './client'
import type { ApiResponse } from '../types/api'
import type {
  ShiftSlot,
  WeekSchedule,
  ShiftRequest,
  CreateSlotPayload,
  UpdateSlotPayload,
  CreateRequestPayload,
  ReviewRequestPayload,
} from '../types/schedule'

// ── Schedule ─────────────────────────────────────────────────────────────────

// Manager: get weekly schedule for a home (week = ISO date of Monday e.g. '2026-06-15')
export const getHomeSchedule = (homeId: string, week: string) =>
  api.get<ApiResponse<WeekSchedule>>(`/homes/${homeId}/schedule`, { params: { week } })

// Manager: create a shift slot
export const createShiftSlot = (homeId: string, payload: CreateSlotPayload) =>
  api.post<ApiResponse<ShiftSlot>>(`/homes/${homeId}/schedule/slots`, payload)

// Manager: update a shift slot
export const updateShiftSlot = (homeId: string, slotId: string, payload: UpdateSlotPayload) =>
  api.patch<ApiResponse<ShiftSlot>>(`/homes/${homeId}/schedule/slots/${slotId}`, payload)

// Manager: delete a shift slot
export const deleteShiftSlot = (homeId: string, slotId: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/homes/${homeId}/schedule/slots/${slotId}`)

// ── Requests ─────────────────────────────────────────────────────────────────

// Staff/manager: get requests for a home (managers see all, staff see own)
export const getScheduleRequests = (homeId: string) =>
  api.get<ApiResponse<ShiftRequest[]>>(`/homes/${homeId}/schedule/requests`)

// Staff: submit a time-off request
export const createScheduleRequest = (homeId: string, payload: CreateRequestPayload) =>
  api.post<ApiResponse<ShiftRequest>>(`/homes/${homeId}/schedule/requests`, payload)

// Manager: approve or deny a request
export const reviewScheduleRequest = (homeId: string, requestId: string, payload: ReviewRequestPayload) =>
  api.patch<ApiResponse<ShiftRequest>>(`/homes/${homeId}/schedule/requests/${requestId}/review`, payload)

// ── My Slots ─────────────────────────────────────────────────────────────────

// Staff/manager: get own upcoming slots across all homes
export const getMySlots = () =>
  api.get<ApiResponse<ShiftSlot[]>>('/schedule/my-slots')
