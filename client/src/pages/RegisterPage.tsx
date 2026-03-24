import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface FormState {
  name:     string;
  email:    string;
  password: string;
  role:     Role;
  phone:    string;
  position: string;
}

const EMPTY: FormState = { name: '', email: '', password: '', role: 'staff', phone: '', position: '' };

export default function RegisterPage() {
  const { token, isOwner } = useAuth();
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

      setSuccess(`Account created for ${json.data.name} (${json.data.role})`);
      setForm(EMPTY);
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Owners can create any role; managers can only create staff
  const roleOptions: { value: Role; label: string }[] = isOwner
    ? [{ value: 'staff', label: 'Staff' }, { value: 'manager', label: 'Manager' }, { value: 'owner', label: 'Owner' }]
    : [{ value: 'staff', label: 'Staff' }];

  const isAdminRole = form.role === 'owner' || form.role === 'manager';

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
            <label htmlFor="name">Full Name</label>
            <input id="name" type="text" value={form.name} onChange={set('name')}
              placeholder="Jane Doe" required autoFocus />
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

          {isAdminRole && (
            <>
              <div className="field-divider">Additional details</div>
              <div className="field">
                <label htmlFor="phone">Phone <span className="required">*</span></label>
                <input id="phone" type="tel" value={form.phone} onChange={set('phone')}
                  placeholder="(555) 000-0000" required />
              </div>
              <div className="field">
                <label htmlFor="position">Job Title <span className="optional">(optional)</span></label>
                <input id="position" type="text" value={form.position} onChange={set('position')}
                  placeholder="e.g. Facility Director" />
              </div>
            </>
          )}

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
