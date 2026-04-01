import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { resetPassword } from '../../api/auth'

export default function ResetPasswordPage() {
  const { token }              = useParams<{ token: string }>()
  const navigate               = useNavigate()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  // Verify the token is structurally present — server validates on submit
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
      <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
        <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6 text-center'>
          <p className='text-sm text-red-600 mb-4'>This reset link is invalid.</p>
          <Link to='/forgot-password' className='text-sm text-blue-600 hover:underline'>
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-gray-900 mb-1'>Set a new password</h1>
        <p className='text-sm text-gray-500 mb-6'>Choose a strong password for your account.</p>

        <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>New password</label>
            <input
              type='password'
              required
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='At least 8 characters'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Confirm password</label>
            <input
              type='password'
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          {error && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{error}</p>
          )}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'
          >
            {loading ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
