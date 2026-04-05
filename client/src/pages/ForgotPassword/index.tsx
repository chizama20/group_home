import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail]         = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword(email)
    } catch {
      // Always show success to prevent enumeration
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-zinc-900 dark:text-white mb-1'>Reset your password</h1>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6'>
          Enter your email and we'll send a reset link if an account exists.
        </p>

        {submitted ? (
          <div className='space-y-4'>
            <p className='text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-3 rounded-lg'>
              If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox.
            </p>
            <Link
              to='/login'
              className='block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline'
            >
              Back to sign in
            </Link>
          </div>
        ) : (
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

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-indigo-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 transition-colors'
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <Link
              to='/login'
              className='block text-center text-sm text-zinc-500 dark:text-zinc-400 hover:underline'
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
