import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextValue {
  user:           User | null;
  token:          string | null;
  login:          (token: string, user: User) => void;
  logout:         () => void;
  isOwner:        boolean;
  isManager:      boolean;
  isManagerOrAbove: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user,  setUser]  = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
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
