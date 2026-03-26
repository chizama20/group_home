import api from './client'
import type { ApiResponse } from '../types/api'
import type { Task } from '../types/task'

export type { Task }

export const getHomeTasks = (homeId: string) =>
  api.get<ApiResponse<Task[]>>(`/homes/${homeId}/tasks`)

export const createTask = (homeId: string, data: { title: string; description?: string; due_date?: string }) =>
  api.post<ApiResponse<{ id: string }>>(`/homes/${homeId}/tasks`, data)

export const claimTask = (id: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/tasks/${id}/claim`)

export const completeTask = (id: string) =>
  api.patch<ApiResponse<{ message: string }>>(`/tasks/${id}/complete`)

export const deleteTask = (id: string) =>
  api.delete<ApiResponse<{ message: string }>>(`/tasks/${id}`)
