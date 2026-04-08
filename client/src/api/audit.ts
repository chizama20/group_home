import api from './client'
import type { ApiResponse } from '../types/api'

export interface AuditLog {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  description: string | null
  ip_address: string | null
  created_at: string
  user_first: string | null
  user_last: string | null
  user_email: string | null
}

export interface AuditLogMeta {
  total: number
  page: number
  limit: number
  pages: number
}

export const getAuditLogs = (params?: {
  action?: string
  entity_type?: string
  user_id?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}) => api.get<ApiResponse<AuditLog[]>>('/audit-logs', { params })
