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

  const [invite, setInvite]             = useState<InviteInfo | null>(null)
  const [tokenError, setTokenError]     = useState<string | null>(null)
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
      <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center'>
        <div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4'>
        <div className='w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6 text-center'>
          <p className='text-sm text-red-600 dark:text-red-400 mb-2'>{tokenError}</p>
          <p className='text-xs text-zinc-400 dark:text-zinc-500'>Contact your administrator for a new invite.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-zinc-900 dark:text-white mb-1'>Accept your invitation</h1>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-4'>
          You've been invited to join <strong className='text-zinc-900 dark:text-white'>{invite?.org_name}</strong>
        </p>

        <div className='bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 mb-6'>
          <span className='text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide'>Role</span>
          <p className='text-sm font-semibold text-zinc-900 dark:text-white mt-0.5'>
            {ROLE_LABELS[invite?.role ?? ''] ?? invite?.role}
          </p>
        </div>

        <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>First name</label>
            <input
              type='text'
              required
              autoFocus
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Last name</label>
            <input
              type='text'
              required
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
              Password <span className='text-zinc-400 dark:text-zinc-500 font-normal'>(min. 8 characters)</span>
            </label>
            <div className='relative'>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
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
            <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg'>{error}</p>
          )}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-indigo-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 transition-colors'
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className='text-xs text-zinc-400 dark:text-zinc-500 text-center mt-4'>
          Your account email: <strong className='text-zinc-600 dark:text-zinc-300'>{invite?.email}</strong>
        </p>
      </div>
    </div>
  )
}
