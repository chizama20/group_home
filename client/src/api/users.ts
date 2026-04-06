import api from './client'
import type { ApiResponse } from '../types/api'

export interface UpdateProfileData {
  first_name?: string
  last_name?: string
  email?: string
}

export const updateProfile = (userId: string, data: UpdateProfileData) =>
  api.patch<ApiResponse<{ message: string }>>(`/users/${userId}`, data)

export const changePassword = (current_password: string, new_password: string) =>
  api.post<ApiResponse<{ message: string }>>('/users/me/password', { current_password, new_password })

export const setSigningPin = (current_password: string, pin: string) =>
  api.post<ApiResponse<{ message: string }>>('/users/me/signing-pin', { current_password, pin })

export const verifySigningPin = (pin: string) =>
  api.post<ApiResponse<{ sign_token: string }>>('/users/me/signing-pin/verify', { pin })
