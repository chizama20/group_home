import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login }        = useAuth();
  const navigate         = useNavigate();
  const [params]         = useSearchParams();

  const [slug,     setSlug]     = useState(params.get('org') ?? '');
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
        body:    JSON.stringify({ organizationSlug: slug, email, password })
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || 'Login failed');
        return;
      }

      login(json.data.token, json.data.user, json.data.organization);
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
            <label htmlFor="slug">Organization ID</label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="e.g. sunrise-group-home"
              required
              autoFocus={!slug}
            />
            <span className="field-hint">Your unique organization ID — provided when your account was created.</span>
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
              autoFocus={!!slug}
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
