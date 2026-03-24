export type Role = 'owner' | 'manager' | 'staff';

export interface Organization {
  id: number;
  name: string;
  slug: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  organizationId: number;
}
