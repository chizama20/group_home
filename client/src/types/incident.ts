export type IncidentStatus = 'open' | 'reviewed' | 'closed' | 'signed_off' | 'escalated'

export interface Incident {
  id: string
  resident_id: string
  home_id: string
  reported_by: string
  title: string
  description: string
  incident_type: string | null
  severity: 'low' | 'medium' | 'high' | null
  occurred_at: string | null
  status: IncidentStatus
  signed_off_by: string | null
  signed_off_at: string | null
  escalated_to: string | null
  created_at: string
  updated_at: string
  // Joined fields returned by GET endpoints
  resident_first?: string
  resident_last?: string
  reporter_first?: string
  reporter_last?: string
}
