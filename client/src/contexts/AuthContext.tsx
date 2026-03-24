import { createContext, useContext, useState, ReactNode } from 'react';
import type { User, Organization } from '../types';

interface AuthContextValue {
  user:             User | null;
  token:            string | null;
  organization:     Organization | null;
  login:            (token: string, user: User, organization: Organization) => void;
  logout:           () => void;
  isOwner:          boolean;
  isManager:        boolean;
  isManagerOrAbove: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token')
  );
  const [user, setUser] = useState<User | null>(() => {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });
  const [organization, setOrganization] = useState<Organization | null>(() => {
    const s = localStorage.getItem('organization');
    return s ? JSON.parse(s) : null;
  });

  const login = (newToken: string, newUser: User, newOrg: Organization) => {
    localStorage.setItem('token',        newToken);
    localStorage.setItem('user',         JSON.stringify(newUser));
    localStorage.setItem('organization', JSON.stringify(newOrg));
    setToken(newToken);
    setUser(newUser);
    setOrganization(newOrg);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{
      user, token, organization, login, logout,
      isOwner:          user?.role === 'owner',
      isManager:        user?.role === 'manager',
      isManagerOrAbove: user?.role === 'owner' || user?.role === 'manager',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
