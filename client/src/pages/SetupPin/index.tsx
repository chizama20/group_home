import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { setSigningPin } from '../../api/users'
import { useAuth } from '../../context/AuthContext'

export default function SetupPinPage() {
  const navigate        = useNavigate()
  const { user, setUser } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [pin, setPin]         = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setLoading(true)
    try {
      await setSigningPin(currentPassword, pin)
      // Update user in context so ProtectedRoute stops redirecting here
      if (user) setUser({ ...user, pin_set_at: new Date().toISOString() })
      navigate('/', { replace: true })
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Failed to set PIN'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-gray-900 mb-1'>Set your signing PIN</h1>
        <p className='text-sm text-gray-500 mb-6'>
          Your 4-digit PIN is your digital signature when recording medications and signing off incidents.
          You must set it before using the app.
        </p>

        <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Current password</label>
            <input type='password' required autoFocus value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500' />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Choose a 4-digit PIN</label>
            <input
              type='password'
              inputMode='numeric'
              pattern='\d{4}'
              maxLength={4}
              required
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-[0.5em] text-center text-lg'
              placeholder='••••'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Confirm PIN</label>
            <input
              type='password'
              inputMode='numeric'
              pattern='\d{4}'
              maxLength={4}
              required
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-[0.5em] text-center text-lg'
              placeholder='••••'
            />
          </div>

          {error && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{error}</p>
          )}

          <button type='submit' disabled={loading}
            className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'>
            {loading ? 'Saving…' : 'Set PIN'}
          </button>
        </form>
      </div>
    </div>
  )
}
