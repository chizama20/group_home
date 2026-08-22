import api from './client'
import type { ApiResponse } from '../types/api'
import type { AuthUser } from '../types/auth'

interface LoginResponse {
  user: AuthUser
  org: { id: string; name: string }
}

interface InviteInfo {
  email:    string
  role:     'staff'
  org_name: string
}

export const login = (email: string, password: string) =>
  api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password })

export const logout = () =>
  api.post<ApiResponse<{ message: string }>>('/auth/logout')

export const getMe = () =>
  api.get<ApiResponse<AuthUser & { org: { id: string; name: string } }>>('/auth/me')

export const forgotPassword = (email: string) =>
  api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email })

export const resetPassword = (token: string, password: string) =>
  api.post<ApiResponse<{ message: string }>>(`/auth/reset-password/${token}`, { password })

export const getInvite = (token: string) =>
  api.get<ApiResponse<InviteInfo>>(`/auth/invite/${token}`)

export const acceptInvite = (token: string, body: { first_name: string; last_name: string; password: string }) =>
  api.post<ApiResponse<LoginResponse>>(`/auth/invite/${token}`, body)

export const selectShift = (homeId: string, shifts: string[]) =>
  api.post<ApiResponse<{ message: string }>>('/auth/shift-select', { home_id: homeId, shifts })
