import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user, logout, isManagerOrAbove } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Group Home</h1>
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
      </main>
    </div>
  );
}
