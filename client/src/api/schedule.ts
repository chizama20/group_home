import api from './client'
import type { ApiResponse } from '../types/api'
import type { ShiftSlot, ScheduleRequest, CreateRequestPayload } from '../types/schedule'

export const getMySlots = () =>
  api.get<ApiResponse<ShiftSlot[]>>('/schedule/my-slots')

export const createScheduleRequest = (homeId: string, payload: CreateRequestPayload) =>
  api.post<ApiResponse<ScheduleRequest>>(`/schedule/homes/${homeId}/requests`, payload)
