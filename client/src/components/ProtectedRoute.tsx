import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  minRole?: 'managerOrAbove' | 'orgAdminOnly';
}

export default function ProtectedRoute({ children, minRole }: Props) {
  const { user, isOrgAdmin, isManagerOrAbove } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (minRole === 'orgAdminOnly'   && !isOrgAdmin)       return <Navigate to="/dashboard" replace />;
  if (minRole === 'managerOrAbove' && !isManagerOrAbove) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
