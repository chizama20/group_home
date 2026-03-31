import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

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
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-gray-900 mb-1'>Reset your password</h1>
        <p className='text-sm text-gray-500 mb-6'>
          Enter your email and we'll send a reset link if an account exists.
        </p>

        {submitted ? (
          <div className='space-y-4'>
            <p className='text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-3 rounded-lg'>
              If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox.
            </p>
            <Link
              to='/login'
              className='block text-center text-sm text-blue-600 hover:underline'
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
              <input
                type='email'
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='you@example.com'
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <Link
              to='/login'
              className='block text-center text-sm text-gray-500 hover:underline'
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
