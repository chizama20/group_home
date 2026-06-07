import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login, user, isLoading } = useAuth()
  const navigate                   = useNavigate()
  const [searchParams]             = useSearchParams()
  const [email, setEmail]          = useState('')
  const [password, setPassword]    = useState('')
  const [error, setError]          = useState<string | null>(null)
  const [loading, setLoading]      = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const timeoutReason = searchParams.get('reason') === 'timeout'

  useEffect(() => {
    if (!isLoading && user) navigate('/', { replace: true })
  }, [isLoading, user, navigate])

  if (isLoading) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center'>
        <div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6'>
        <h1 className='text-2xl font-bold text-zinc-900 dark:text-white mb-1'>Group Home</h1>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6'>Sign in to continue</p>

        {timeoutReason && (
          <p className='text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2 rounded-lg mb-4'>
            You were logged out for security after 15 minutes of inactivity.
          </p>
        )}

        <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Email</label>
            <input
              type='email'
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
              placeholder='you@example.com'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Password</label>
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
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded'
              >
                {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
            <div className='text-right mt-1'>
              <Link to='/forgot-password' className='text-xs text-indigo-600 dark:text-indigo-400 hover:underline'>
                Forgot password?
              </Link>
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className='text-xs text-zinc-400 dark:text-zinc-500 text-center mt-6'>
          New organisation?{' '}
          <Link to='/request-access' className='text-indigo-600 dark:text-indigo-400 hover:underline'>
            Request access →
          </Link>
        </p>
      </div>
    </div>
  )
}
