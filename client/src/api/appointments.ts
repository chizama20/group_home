import api from './client'
import type { ApiResponse } from '../types/api'
import type { Appointment, AppointmentFormData } from '../types/appointment'

export type { Appointment, AppointmentFormData }

export const getHomeAppointments = (homeId: string, params?: { from?: string; days?: number }) =>
  api.get<ApiResponse<Appointment[]>>(`/homes/${homeId}/appointments`, { params })

export const getResidentAppointments = (residentId: string) =>
  api.get<ApiResponse<Appointment[]>>(`/residents/${residentId}/appointments`)

export const createAppointment = (homeId: string, data: AppointmentFormData) =>
  api.post<ApiResponse<{ id: string }>>(`/homes/${homeId}/appointments`, data)

export const completeAppointment = (id: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/appointments/${id}/complete`)
