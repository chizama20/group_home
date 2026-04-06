import api from './client'
import type { ApiResponse } from '../types/api'
import type { UserRole } from '../types/auth'

export interface OrgStaffMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface OrgDetails {
  id: string
  name: string
  created_at: string
}

export interface InviteUserData {
  first_name: string
  last_name: string
  email: string
  password: string
  role: UserRole
}

export interface OrgDashboardStats {
  totalHomes: number
  totalResidents: number
  totalStaff: number
  openIncidents: number
}

export interface OrgDashboardHome {
  id: string
  name: string
  address: string
  is_active: boolean
  resident_count: number
  staff_count: number
}

export interface NeedsAttentionItem {
  type: string
  count: number
  label: string
  severity: 'info' | 'warning' | 'error'
}

export interface OrgDashboardData {
  stats: OrgDashboardStats
  homes: OrgDashboardHome[]
  needsAttention: NeedsAttentionItem[]
}

export const getOrg = () =>
  api.get<ApiResponse<OrgDetails>>('/organizations')

export const updateOrg = (name: string) =>
  api.put<ApiResponse<{ message: string }>>('/organizations', { name })

export const getOrgStaff = (orgId: string) =>
  api.get<ApiResponse<OrgStaffMember[]>>(`/orgs/${orgId}/staff`)

export const inviteUser = (data: InviteUserData) =>
  api.post<ApiResponse<{ id: string; first_name: string; last_name: string; email: string; role: UserRole }>>('/orgs/invite', data)

export const updateUserRole = (userId: string, role: UserRole) =>
  api.patch<ApiResponse<{ message: string }>>(`/users/${userId}/role`, { role })

export const deactivateUser = (userId: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/users/${userId}/deactivate`)

export const getOrgDashboard = () =>
  api.get<ApiResponse<OrgDashboardData>>('/orgs/dashboard')
