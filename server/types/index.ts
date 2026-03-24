export type Role = 'owner' | 'manager' | 'staff';

export interface Home {
  id: number;
  organization_id: number;
  name: string;
  address?: string;
  phone?: string;
  active: boolean;
  created_at: Date;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: 'trial' | 'active' | 'suspended';
  created_at: Date;
}

export interface User {
  id: number;
  organization_id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  phone?: string;
  position?: string;
  active: boolean;
  created_at: Date;
}

export interface Resident {
  id: number;
  organization_id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  room_number?: string;
  notes?: string;
  active: boolean;
  created_at: Date;
}

export interface DailyLog {
  id: number;
  organization_id: number;
  resident_id: number;
  user_id: number;
  mood: 'great' | 'good' | 'neutral' | 'upset' | 'crisis';
  behavior: 'calm' | 'agitated' | 'aggressive' | 'withdrawn' | 'other';
  notes?: string;
  logged_at: Date;
}

export interface Medication {
  id: number;
  organization_id: number;
  resident_id: number;
  name: string;
  dosage: string;
  frequency: 'daily' | 'twice_daily' | 'three_times_daily' | 'as_needed' | 'weekly';
  instructions?: string;
  active: boolean;
  created_at: Date;
}

export interface MedicationLog {
  id: number;
  organization_id: number;
  medication_id: number;
  user_id: number;
  status: 'given' | 'refused' | 'missed';
  notes?: string;
  administered_at: Date;
}

export interface Incident {
  id: number;
  organization_id: number;
  resident_id: number;
  user_id: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'behavioral' | 'medical' | 'property' | 'safety' | 'other';
  description: string;
  action_taken?: string;
  reported_to_supervisor: boolean;
  occurred_at: Date;
  created_at: Date;
}

export interface ShiftNote {
  id: number;
  organization_id: number;
  home_id: number;
  user_id: number;
  shift: 'morning' | 'afternoon' | 'overnight';
  content: string;
  flagged: boolean;
  created_at: Date;
}

export interface JwtPayload {
  id: number;
  email: string;
  role: Role;
  organizationId: number;
}
