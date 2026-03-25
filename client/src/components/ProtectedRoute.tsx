import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  minRole?: 'managerOrAbove' | 'ownerOnly';
}

export default function ProtectedRoute({ children, minRole }: Props) {
  const { user, isOwner, isManagerOrAbove } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (minRole === 'ownerOnly'      && !isOwner)          return <Navigate to="/dashboard" replace />;
  if (minRole === 'managerOrAbove' && !isManagerOrAbove) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
