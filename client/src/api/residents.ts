import api from './client'
import type { ApiResponse } from '../types/api'
import type { Resident, TrackedBehavior, ResidentContact, ResidentGoal, ResidentVitalsConfig } from '../types/resident'

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

// Discharge
export const dischargeResident = (id: string) =>
  api.post<ApiResponse<{ message: string }>>(`/residents/${id}/discharge`)

// Contacts
export const getContacts = (residentId: string) =>
  api.get<ApiResponse<ResidentContact[]>>(`/residents/${residentId}/contacts`)

export const addContact = (residentId: string, data: Omit<ResidentContact, 'id' | 'resident_id' | 'is_active' | 'created_at' | 'updated_at'>) =>
  api.post<ApiResponse<{ id: string }>>(`/residents/${residentId}/contacts`, data)

export const updateContact = (contactId: string, data: Partial<Omit<ResidentContact, 'id' | 'resident_id' | 'created_at' | 'updated_at'>>) =>
  api.patch<ApiResponse<{ message: string }>>(`/contacts/${contactId}`, data)

export const deleteContact = (contactId: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/contacts/${contactId}`)

// Goals
export const getGoals = (residentId: string) =>
  api.get<ApiResponse<ResidentGoal[]>>(`/residents/${residentId}/goals`)

export const addGoal = (residentId: string, data: Pick<ResidentGoal, 'goal_type' | 'code' | 'description'>) =>
  api.post<ApiResponse<{ id: string }>>(`/residents/${residentId}/goals`, data)

export const updateGoal = (goalId: string, data: Partial<Pick<ResidentGoal, 'code' | 'description'>>) =>
  api.patch<ApiResponse<{ message: string }>>(`/goals/${goalId}`, data)

export const deleteGoal = (goalId: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/goals/${goalId}`)

// Vitals Config
export const getVitalsConfig = (residentId: string) =>
  api.get<ApiResponse<ResidentVitalsConfig[]>>(`/residents/${residentId}/vitals-config`)

export const addVitalsConfig = (residentId: string, data: Omit<ResidentVitalsConfig, 'id' | 'resident_id' | 'is_active' | 'created_at' | 'updated_at'>) =>
  api.post<ApiResponse<{ id: string }>>(`/residents/${residentId}/vitals-config`, data)

export const updateVitalsConfig = (configId: string, data: Partial<Omit<ResidentVitalsConfig, 'id' | 'resident_id' | 'created_at' | 'updated_at'>>) =>
  api.patch<ApiResponse<{ message: string }>>(`/vitals-config/${configId}`, data)

export const deleteVitalsConfig = (configId: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/vitals-config/${configId}`)
