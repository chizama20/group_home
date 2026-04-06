import api from './client'
import type { ApiResponse } from '../types/api'

export interface Invitation {
  id: string
  email: string
  role: string
  home_id?: string
  expires_at: string
  created_at: string
}

export const getInvitations = () =>
  api.get<ApiResponse<Invitation[]>>('/orgs/invitations')

export const resendInvitation = (id: string) =>
  api.post<ApiResponse<{ message: string }>>(`/invitations/${id}/resend`)

export const cancelInvitation = (id: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/invitations/${id}`)
