import api from './client'
import type { ApiResponse } from '../types/api'

export interface Appointment {
  id: string
  resident_id: string
  home_id: string
  scheduled_by: string
  type: string
  title: string
  appointment_date: string
  appointment_time: string | null
  location: string | null
  notes: string | null
  collector_name: string | null
  collector_phone: string | null
  completed_by: string | null
  completed_at: string | null
  created_at: string
}

export const getHomeAppointments = (homeId: string, params?: { from?: string; days?: number }) =>
  api.get<ApiResponse<Appointment[]>>(`/homes/${homeId}/appointments`, { params })

export const getResidentAppointments = (residentId: string) =>
  api.get<ApiResponse<Appointment[]>>(`/residents/${residentId}/appointments`)

export const createAppointment = (homeId: string, data: Partial<Appointment>) =>
  api.post<ApiResponse<{ id: string }>>(`/homes/${homeId}/appointments`, data)

export const completeAppointment = (id: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/appointments/${id}/complete`)
