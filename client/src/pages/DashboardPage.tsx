import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user, org, logout, isManagerOrAbove } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>{org?.name ?? 'Group Home'}</h1>
        <div className="header-right">
          <span className="user-info">
            {user?.first_name} {user?.last_name}
            <span className={`role-badge ${user?.role}`}>{user?.role?.replace('_', ' ')}</span>
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
        <p>Welcome back, {user?.first_name}. Dashboard coming soon.</p>

        {org && (
          <div className="org-id-banner">
            Your Organization ID is <strong>{org.id}</strong>
            <br />
            Share this with staff so they can log in.
          </div>
        )}
      </main>
    </div>
  );
}
