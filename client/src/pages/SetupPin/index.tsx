import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { setSigningPin } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function SetupPinPage() {
  const navigate        = useNavigate()
  const { user, setUser } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [pin, setPin]         = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showPin, setShowPin]         = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)

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
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setError(e?.response?.data?.error?.message ?? 'Failed to set PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6'>
        <h1 className='text-xl font-bold text-zinc-900 dark:text-white mb-1'>Set your signing PIN</h1>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6'>
          Your 4-digit PIN is your digital signature when recording medications and signing off incidents.
          You must set it before using the app.
        </p>

        <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Current password</label>
            <div className='relative'>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                autoFocus
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'
              />
              <button
                type='button'
                onClick={() => setShowCurrentPassword(v => !v)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Choose a 4-digit PIN</label>
            <div className='relative'>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode='numeric'
                pattern='\d{4}'
                maxLength={4}
                required
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary tracking-[0.5em] text-center text-lg'
                placeholder='••••'
              />
              <button
                type='button'
                onClick={() => setShowPin(v => !v)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                tabIndex={-1}
              >
                {showPin ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Confirm PIN</label>
            <div className='relative'>
              <input
                type={showConfirmPin ? 'text' : 'password'}
                inputMode='numeric'
                pattern='\d{4}'
                maxLength={4}
                required
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary tracking-[0.5em] text-center text-lg'
                placeholder='••••'
              />
              <button
                type='button'
                onClick={() => setShowConfirmPin(v => !v)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                tabIndex={-1}
              >
                {showConfirmPin ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
          </div>

          {error && (
            <div className='bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>{error}</div>
          )}

          <button type='submit' disabled={loading}
            className='w-full bg-primary text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'>
            {loading ? 'Saving…' : 'Set PIN'}
          </button>
        </form>
      </div>
    </div>
  )
}
