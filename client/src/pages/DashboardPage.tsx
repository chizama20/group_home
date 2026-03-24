import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user, organization, logout, isManagerOrAbove } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>{organization?.name ?? 'Group Home'}</h1>
        </div>
        <div className="header-right">
          <span className="user-info">
            {user?.name}
            <span className={`role-badge ${user?.role}`}>{user?.role}</span>
          </span>
          {isManagerOrAbove && (
            <button className="btn-secondary" onClick={() => navigate('/register')}>
              Add User
            </button>
          )}
          <button className="btn-outline" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <p>Welcome back, {user?.name}. Dashboard coming soon.</p>

        {organization && (
          <div className="org-id-banner">
            <span>Your Organization ID is <strong>{organization.slug}</strong> — share this with staff so they can log in.</span>
          </div>
        )}
      </main>
    </div>
  );
}
