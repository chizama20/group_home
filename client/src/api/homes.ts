import api from './client'
import type { ApiResponse } from '../types/api'

export interface Home {
  id: string
  org_id: string
  name: string
  address: string | null
  is_active: boolean
  created_at: string
}

export interface RosterEntry {
  id: string
  home_id: string
  user_id: string
  shift: string
  shift_date: string
  clocked_in_at: string | null
  clocked_out_at: string | null
}

export const getHomes = () =>
  api.get<ApiResponse<Home[]>>('/homes')

export const getHomeRoster = (homeId: string, params?: { shift?: string; date?: string }) =>
  api.get<ApiResponse<RosterEntry[]>>(`/homes/${homeId}/roster`, { params })

export const clockIn = (homeId: string, data: { shift: string; shift_date: string }) =>
  api.post<ApiResponse<{ message: string }>>(`/homes/${homeId}/roster/clockin`, data)

export const clockOut = (homeId: string, data: { shift: string; shift_date: string }) =>
  api.post<ApiResponse<{ message: string }>>(`/homes/${homeId}/roster/clockout`, data)
