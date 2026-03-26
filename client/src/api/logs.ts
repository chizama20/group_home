import api from './client'
import type { ApiResponse } from '../types/api'
import type { IposLog, BehavioralLog, ShiftNote, Announcement, Shift } from '../types/log'

// IPOS
export const getHomeIpos = (homeId: string, params?: { date?: string; shift?: Shift }) =>
  api.get<ApiResponse<IposLog[]>>(`/homes/${homeId}/ipos`, { params })

export const getResidentIpos = (residentId: string) =>
  api.get<ApiResponse<IposLog[]>>(`/residents/${residentId}/ipos`)

export const createIposLog = (homeId: string, data: Omit<IposLog, 'id' | 'home_id' | 'user_id' | 'created_at'>) =>
  api.post<ApiResponse<{ id: string }>>(`/homes/${homeId}/ipos`, data)

// Behavioral logs
export const getHomeBehavioralLogs = (homeId: string) =>
  api.get<ApiResponse<BehavioralLog[]>>(`/homes/${homeId}/behavioral-logs`)

export const getResidentBehavioralLogs = (residentId: string) =>
  api.get<ApiResponse<BehavioralLog[]>>(`/residents/${residentId}/behavioral-logs`)

export const createBehavioralLog = (homeId: string, data: { resident_id: string; behavior_id: string; notes?: string; occurred_at: string }) =>
  api.post<ApiResponse<{ id: string }>>(`/homes/${homeId}/behavioral-logs`, data)

// Shift notes
export const getShiftNotes = (homeId: string, params?: { shift?: Shift; date?: string }) =>
  api.get<ApiResponse<ShiftNote[]>>(`/homes/${homeId}/shift-notes`, { params })

export const createShiftNote = (homeId: string, data: Omit<ShiftNote, 'id' | 'home_id' | 'user_id' | 'created_at'>) =>
  api.post<ApiResponse<{ id: string }>>(`/homes/${homeId}/shift-notes`, data)

// Announcements
export const getAnnouncements = (homeId: string) =>
  api.get<ApiResponse<Announcement[]>>(`/homes/${homeId}/announcements`)

export const createAnnouncement = (orgId: string, data: { title: string; body: string; home_id?: string; is_pinned?: boolean }) =>
  api.post<ApiResponse<{ id: string }>>(`/orgs/${orgId}/announcements`, data)
