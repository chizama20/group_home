import api from './client'
import type { ApiResponse } from '../types/api'

export type FacilityType = 'group_home' | 'assisted_living' | 'foster_care' | 'supported_living' | 'day_program' | 'other'
export type OrgRequestStatus = 'pending' | 'approved' | 'rejected'
export type OrgStatus = 'pending' | 'pending_baa' | 'active' | 'suspended'

export interface OrgRequest {
  id:                 string
  org_name:           string
  contact_name:       string
  contact_email:      string
  contact_phone:      string
  num_homes:          number
  state:              string
  facility_type:      FacilityType
  current_operations: string | null
  additional_notes:   string | null
  status:             OrgRequestStatus
  rejection_reason:   string | null
  reviewed_at:        string | null
  created_at:         string
}

export interface AdminOrg {
  id:            string
  name:          string
  facility_type: FacilityType
  status:        OrgStatus
  baa_signed_at: string | null
  created_at:    string
}

// Auth
export const adminLogin  = (email: string, password: string) =>
  api.post<ApiResponse<{ message: string }>>('/admin/auth/login', { email, password })

export const adminLogout = () =>
  api.post<ApiResponse<{ message: string }>>('/admin/auth/logout')

// Org requests
export const getOrgRequests = (status?: 'pending' | 'all') =>
  api.get<ApiResponse<OrgRequest[]>>('/admin/org-requests', { params: { status } })

export const getOrgRequest = (id: string) =>
  api.get<ApiResponse<OrgRequest>>(`/admin/org-requests/${id}`)

export const approveOrgRequest = (id: string) =>
  api.post<ApiResponse<{ org_id: string }>>(`/admin/org-requests/${id}/approve`)

export const rejectOrgRequest = (id: string, reason?: string) =>
  api.post<ApiResponse<{ message: string }>>(`/admin/org-requests/${id}/reject`, { reason })

// Orgs
export const getAdminOrgs = () =>
  api.get<ApiResponse<AdminOrg[]>>('/admin/orgs')

export const suspendOrg = (id: string) =>
  api.post<ApiResponse<{ message: string }>>(`/admin/orgs/${id}/suspend`)

export const reactivateOrg = (id: string) =>
  api.post<ApiResponse<{ message: string }>>(`/admin/orgs/${id}/reactivate`)
