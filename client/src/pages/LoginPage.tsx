import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login }        = useAuth();
  const navigate         = useNavigate();
  const [params]         = useSearchParams();

  const [orgId,    setOrgId]    = useState(params.get('org') ?? '');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res  = await fetch('http://localhost:3000/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ org_id: orgId, email, password })
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || 'Login failed');
        return;
      }

      login(json.data.token, json.data.user, json.data.org);
      navigate('/dashboard');
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Group Home</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label htmlFor="orgId">Organization ID</label>
            <input
              id="orgId"
              type="text"
              value={orgId}
              onChange={e => setOrgId(e.target.value)}
              placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              autoFocus={!orgId}
            />
            <span className="field-hint">Your organization UUID — shown on the dashboard when you first sign up.</span>
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus={!!orgId}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          New organization? <Link to="/signup">Create your account</Link>
        </p>
      </div>
    </div>
  );
}
