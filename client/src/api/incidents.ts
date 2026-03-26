import api from './client'
import type { ApiResponse } from '../types/api'
import type { Incident } from '../types/incident'

export const getHomeIncidents = (homeId: string, params?: { status?: string }) =>
  api.get<ApiResponse<Incident[]>>(`/homes/${homeId}/incidents`, { params })

export const getIncident = (id: string) =>
  api.get<ApiResponse<Incident>>(`/incidents/${id}`)

export const createIncident = (homeId: string, data: {
  resident_id: string
  incident_type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  occurred_at: string
}) => api.post<ApiResponse<{ id: string }>>(`/homes/${homeId}/incidents`, data)

export const signOffIncident = (id: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/incidents/${id}/sign-off`)

export const escalateIncident = (id: string, escalatedTo: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/incidents/${id}/escalate`, { escalated_to: escalatedTo })
