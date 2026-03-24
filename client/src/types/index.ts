export type Role = 'owner' | 'manager' | 'staff';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
