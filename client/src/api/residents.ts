import api from './client'
import type { ApiResponse } from '../types/api'
import type { Resident, TrackedBehavior } from '../types/resident'

export const getResidents = (homeId: string) =>
  api.get<ApiResponse<Resident[]>>(`/homes/${homeId}/residents`)

export const getResident = (id: string) =>
  api.get<ApiResponse<Resident>>(`/residents/${id}`)

export const createResident = (homeId: string, data: Partial<Resident>) =>
  api.post<ApiResponse<{ id: string }>>(`/homes/${homeId}/residents`, data)

export const updateResident = (id: string, data: Partial<Resident>) =>
  api.patch<ApiResponse<{ message: string }>>(`/residents/${id}`, data)

export const archiveResident = (id: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/residents/${id}/archive`)

export const getBehaviors = (residentId: string) =>
  api.get<ApiResponse<TrackedBehavior[]>>(`/residents/${residentId}/behaviors`)

export const createBehavior = (residentId: string, data: { name: string; description?: string }) =>
  api.post<ApiResponse<{ id: string }>>(`/residents/${residentId}/behaviors`, data)

export const deleteBehavior = (residentId: string, behaviorId: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/residents/${residentId}/behaviors/${behaviorId}`)
