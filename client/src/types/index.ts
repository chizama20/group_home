export type Role = 'employee' | 'manager' | 'org_admin';

export interface Org {
  id: string;
  name: string;
  created_at: string;
}

export interface Home {
  id: string;
  org_id: string;
  name: string;
  address?: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
}
