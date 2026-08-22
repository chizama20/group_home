import api from './client'
import type { ApiResponse } from '../types/api'
import type { Medication } from '../types/medication'

export const getHomeMedications = (homeId: string) =>
  api.get<ApiResponse<Medication[]>>(`/homes/${homeId}/medications`)

export const getResidentMedications = (residentId: string) =>
  api.get<ApiResponse<Medication[]>>(`/residents/${residentId}/medications`)

export const createMedication = (residentId: string, data: Partial<Medication>) =>
  api.post<ApiResponse<{ id: string }>>(`/residents/${residentId}/medications`, data)

export const updateMedication = (id: string, data: Partial<Medication>) =>
  api.patch<ApiResponse<{ message: string }>>(`/medications/${id}`, data)

export const deleteMedication = (id: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/medications/${id}`)
