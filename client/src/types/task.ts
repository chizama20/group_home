export interface Task {
  id: string
  home_id: string
  created_by: string
  title: string
  description: string | null
  due_date: string | null
  claimed_by: string | null
  claimed_at: string | null
  completed_at: string | null
  created_at: string
}
