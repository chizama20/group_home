import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { resetPassword } from '../../api/auth'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const { token }              = useParams<{ token: string }>()
  const navigate               = useNavigate()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)

  useEffect(() => {
    setTokenValid(!!token && token.length > 0)
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token!, password)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset link is invalid or has expired')
    } finally {
      setLoading(false)
    }
  }

  if (tokenValid === false) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4'>
        <div className='w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6 text-center'>
          <p className='text-sm text-red-600 dark:text-red-400 mb-4'>This reset link is invalid.</p>
          <Link to='/forgot-password' className='text-sm text-primary dark:text-primary hover:underline'>
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-zinc-900 dark:text-white mb-1'>Set a new password</h1>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6'>Choose a strong password for your account.</p>

        <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>New password</label>
            <div className='relative'>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder='At least 8 characters'
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

          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Confirm password</label>
            <div className='relative'>
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'
              />
              <button
                type='button'
                onClick={() => setShowConfirm(v => !v)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
          </div>

          {error && (
            <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg'>{error}</p>
          )}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-primary text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-primary disabled:opacity-50 transition-colors'
          >
            {loading ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
