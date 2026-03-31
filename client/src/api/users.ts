import api from './client'
import type { ApiResponse } from '../types/api'

export const setSigningPin = (current_password: string, pin: string) =>
  api.post<ApiResponse<{ message: string }>>('/users/me/signing-pin', { current_password, pin })

export const verifySigningPin = (pin: string) =>
  api.post<ApiResponse<{ sign_token: string }>>('/users/me/signing-pin/verify', { pin })
