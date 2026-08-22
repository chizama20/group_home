export type Role = 'staff' | 'admin';

export interface Org {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Home {
  id: string;
  org_id: string;
  name: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  invited_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Resident {
  id: string;
  home_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  room?: string;
  diagnosis?: string;
  physician?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_relation?: string;
  notes?: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Medication {
  id: string;
  resident_id: string;
  name: string;
  dosage: string;
  frequency: string;
  scheduled_time?: string;
  instructions?: string;
  is_active: boolean;
  created_at: Date;
}

export interface ShiftNote {
  id: string;
  home_id: string;
  user_id: string;
  resident_id?: string;
  shift: 'morning' | 'afternoon' | 'overnight';
  shift_date: string;
  content: string;
  flagged: boolean;
  created_at: Date;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  org_id: string;
}
