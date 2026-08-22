export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
  /** Pagination metadata, sent by list endpoints that paginate (e.g. audit logs). */
  meta?: { total?: number; page?: number; per_page?: number; limit?: number; pages?: number }
}
