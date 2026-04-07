import api from './client'
import type { ApiResponse } from '../types/api'
import type { Medication, MedicationOutcome, BulkAdministerResult, MarEntry, HomeMarEntry } from '../types/medication'

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

export const administerMedication = (id: string, data: { outcome: MedicationOutcome; notes?: string }) =>
  api.post<ApiResponse<{ id: string }>>(`/medications/${id}/administer`, data)

export const bulkAdminister = (data: { medication_ids: string[]; outcome: MedicationOutcome; notes?: string }) =>
  api.post<ApiResponse<{ results: BulkAdministerResult[] }>>('/medications/bulk-administer', data)

export const getResidentMedLogs = (residentId: string, date?: string) =>
  api.get<ApiResponse<MarEntry[]>>(`/residents/${residentId}/medication-logs`, { params: date ? { date } : {} })

export const getHomeMar = (homeId: string, date?: string) =>
  api.get<ApiResponse<HomeMarEntry[]>>(`/homes/${homeId}/mar`, { params: date ? { date } : {} })
