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
  email: string
  role: 'employee' | 'manager'
  home_id?: string
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
  api.post<ApiResponse<{ message: string }>>('/orgs/invite', data)

export const updateUserRole = (userId: string, role: UserRole) =>
  api.patch<ApiResponse<{ message: string }>>(`/users/${userId}/role`, { role })

export const deactivateUser = (userId: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/users/${userId}/deactivate`)

export const getOrgDashboard = () =>
  api.get<ApiResponse<OrgDashboardData>>('/orgs/dashboard')

export interface OrgIncident {
  id: string
  home_id: string
  home_name: string
  resident_id: string
  resident_first: string
  resident_last: string
  reporter_first: string
  reporter_last: string
  incident_type: string | null
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | null
  status: string
  occurred_at: string | null
  signed_off_by: string | null
  signed_off_at: string | null
  created_at: string
}

export interface IposCompliance {
  home_id: string
  home_name: string
  total_residents: number
  filed_count: number
  percentage: number
}

export const getOrgIncidents = (params?: { home_id?: string; status?: string; severity?: string }) =>
  api.get<ApiResponse<OrgIncident[]>>('/orgs/incidents', { params })

export const getOrgIposCompliance = (date?: string) =>
  api.get<ApiResponse<IposCompliance[]>>('/orgs/ipos-compliance', { params: date ? { date } : {} })

export const exportCsv = (data: { type: 'incidents' | 'ipos' | 'medications'; home_id?: string; date_from?: string; date_to?: string }) =>
  api.post<string>('/exports/csv', data, { responseType: 'text' })

export const exportOrgCsv = (data: {
  type: 'residents' | 'incidents' | 'medications' | 'audit_logs'
  home_id?: string
  date_from?: string
  date_to?: string
}) => api.post<string>('/exports/', data, { responseType: 'blob' })
