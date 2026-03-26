import api from './client'
import type { ApiResponse } from '../types/api'
import type { AuthUser } from '../types/auth'

interface LoginResponse {
  token: string
  user: AuthUser
  org: { id: string; name: string }
}

export const login = (orgId: string, email: string, password: string) =>
  api.post<ApiResponse<LoginResponse>>('/auth/login', { org_id: orgId, email, password })

export const logout = () =>
  api.post<ApiResponse<{ message: string }>>('/auth/logout')

export const getMe = () =>
  api.get<ApiResponse<AuthUser & { org: { id: string; name: string } }>>('/auth/me')
