import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';

interface FormState {
  first_name: string;
  last_name:  string;
  email:      string;
  password:   string;
  role:       Role;
}

const EMPTY: FormState = { first_name: '', last_name: '', email: '', password: '', role: 'employee' };

export default function RegisterPage() {
  const { token, isOrgAdmin } = useAuth();
  const navigate           = useNavigate();
  const [form,    setForm]    = useState<FormState>(EMPTY);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res  = await fetch('http://localhost:3000/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify(form)
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || 'Registration failed');
        return;
      }

      setSuccess(`Account created for ${json.data.first_name} ${json.data.last_name} (${json.data.role})`);
      setForm(EMPTY);
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Org admins can create any role; managers can only create employees
  const roleOptions: { value: Role; label: string }[] = isOrgAdmin
    ? [{ value: 'employee', label: 'Employee' }, { value: 'manager', label: 'Manager' }, { value: 'org_admin', label: 'Org Admin' }]
    : [{ value: 'employee', label: 'Employee' }];

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <button className="back-link" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1>Create Account</h1>
        <p className="auth-subtitle">Add a new team member</p>

        <form onSubmit={handleSubmit} className="auth-form">

          <div className="role-toggle">
            {roleOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`toggle-btn ${form.role === opt.value ? 'active' : ''}`}
                onClick={() => setForm(prev => ({ ...prev, role: opt.value }))}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="field">
            <label htmlFor="first_name">First Name</label>
            <input id="first_name" type="text" value={form.first_name} onChange={set('first_name')}
              placeholder="Jane" required autoFocus />
          </div>

          <div className="field">
            <label htmlFor="last_name">Last Name</label>
            <input id="last_name" type="text" value={form.last_name} onChange={set('last_name')}
              placeholder="Doe" required />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={set('email')}
              placeholder="jane@example.com" required />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={form.password} onChange={set('password')}
              placeholder="••••••••" required />
          </div>


{error   && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
