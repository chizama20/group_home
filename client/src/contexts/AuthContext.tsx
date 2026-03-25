import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User, Org } from '../types';

interface AuthContextValue {
  user:             User | null;
  token:            string | null;
  org:              Org | null;
  login:            (token: string, user: User, org: Org) => void;
  logout:           () => void;
  isOrgAdmin:       boolean;
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
  const [org, setOrg] = useState<Org | null>(() => {
    const s = localStorage.getItem('org');
    return s ? JSON.parse(s) : null;
  });

  const login = (newToken: string, newUser: User, newOrg: Org) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user',  JSON.stringify(newUser));
    localStorage.setItem('org',   JSON.stringify(newOrg));
    setToken(newToken);
    setUser(newUser);
    setOrg(newOrg);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('org');
    setToken(null);
    setUser(null);
    setOrg(null);
  };

  return (
    <AuthContext.Provider value={{
      user, token, org, login, logout,
      isOrgAdmin:       user?.role === 'org_admin',
      isManager:        user?.role === 'manager',
      isManagerOrAbove: user?.role === 'org_admin' || user?.role === 'manager',
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
