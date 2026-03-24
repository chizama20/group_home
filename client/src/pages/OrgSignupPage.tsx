import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function OrgSignupPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [orgName,   setOrgName]   = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [phone,     setPhone]     = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('http://localhost:3000/auth/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          organizationName: orgName,
          ownerName,
          email,
          password,
          phone: phone || undefined
        })
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || 'Signup failed');
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
        <p className="auth-subtitle">Create your organization</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field-divider">Your organization</div>

          <div className="field">
            <label htmlFor="orgName">Organization Name</label>
            <input id="orgName" type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
              placeholder="Sunshine Group Home" required autoFocus />
          </div>

          <div className="field-divider">Your account</div>

          <div className="field">
            <label htmlFor="ownerName">Your Name</label>
            <input id="ownerName" type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)}
              placeholder="Jane Doe" required />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="jane@example.com" required />
          </div>

          <div className="field">
            <label htmlFor="phone">Phone <span className="optional">(optional)</span></label>
            <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="(555) 000-0000" />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirm Password</label>
            <input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••" required />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create organization'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
