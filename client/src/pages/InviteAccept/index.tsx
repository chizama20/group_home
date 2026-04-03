import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInvite, acceptInvite } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

interface InviteInfo {
  email:    string
  role:     'employee' | 'manager'
  org_name: string
}

const ROLE_LABELS: Record<string, string> = {
  employee: 'Employee',
  manager:  'Manager',
}

export default function InviteAcceptPage() {
  const { token }          = useParams<{ token: string }>()
  const navigate           = useNavigate()
  const { setUser }        = useAuth()

  const [invite, setInvite]       = useState<InviteInfo | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenError('Invalid invite link')
      setLoadingInvite(false)
      return
    }
    getInvite(token)
      .then(res => {
        if (res.data.success && res.data.data) {
          setInvite(res.data.data)
        } else {
          setTokenError('This invite link is invalid or has expired')
        }
      })
      .catch(() => setTokenError('This invite link is invalid or has expired'))
      .finally(() => setLoadingInvite(false))
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res  = await acceptInvite(token!, { first_name: firstName, last_name: lastName, password })
      const data = res.data
      if (!data.success || !data.data) throw new Error('Failed to accept invite')

      setUser(data.data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
    } finally {
      setLoading(false)
    }
  }

  if (loadingInvite) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin' />
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
        <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6 text-center'>
          <p className='text-sm text-red-600 mb-2'>{tokenError}</p>
          <p className='text-xs text-gray-400'>Contact your administrator for a new invite.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-gray-900 mb-1'>Accept your invitation</h1>
        <p className='text-sm text-gray-500 mb-4'>
          You've been invited to join <strong>{invite?.org_name}</strong>
        </p>

        {/* Role shown read-only — cannot be changed by invitee */}
        <div className='bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-6'>
          <span className='text-xs text-gray-500 uppercase tracking-wide'>Role</span>
          <p className='text-sm font-semibold text-gray-800 mt-0.5'>
            {ROLE_LABELS[invite?.role ?? ''] ?? invite?.role}
          </p>
        </div>

        <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>First name</label>
            <input
              type='text'
              required
              autoFocus
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Last name</label>
            <input
              type='text'
              required
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Password <span className='text-gray-400 font-normal'>(min. 8 characters)</span>
            </label>
            <div className='relative'>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <button
                type='button'
                onClick={() => setShowPassword(v => !v)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
          </div>

          {error && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{error}</p>
          )}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className='text-xs text-gray-400 text-center mt-4'>
          Your account email: <strong>{invite?.email}</strong>
        </p>
      </div>
    </div>
  )
}
