import { useState } from 'react'
import { verifySigningPin } from '../api/users'

interface Props {
  open:     boolean
  onSuccess: (sign_token: string) => void
  onCancel:  () => void
}

export default function PinModal({ open, onSuccess, onCancel }: Props) {
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleSubmit() {
    if (!/^\d{4}$/.test(pin)) {
      setError('Enter your 4-digit PIN')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await verifySigningPin(pin)
      if (res.data.success && res.data.data?.sign_token) {
        setPin('')
        onSuccess(res.data.data.sign_token)
      }
    } catch {
      setError('Incorrect PIN')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setPin('')
    setError(null)
    onCancel()
  }

  return (
    <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center'>
      {/* Backdrop */}
      <div className='absolute inset-0 bg-black/50' onClick={handleCancel} />

      {/* Sheet — full-screen bottom sheet on mobile, modal on desktop */}
      <div className='relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 z-10'>
        <h2 className='text-lg font-semibold text-gray-900 mb-1 text-center'>Enter your signing PIN</h2>
        <p className='text-sm text-gray-500 text-center mb-6'>
          Your 4-digit PIN is required to record this administration.
        </p>

        <input
          type='password'
          inputMode='numeric'
          pattern='\d{4}'
          maxLength={4}
          autoFocus
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => { if (e.key === 'Enter') void handleSubmit() }}
          className='w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-center text-3xl tracking-[0.75em] focus:outline-none focus:border-blue-500 mb-4'
          placeholder='••••'
        />

        {error && (
          <p className='text-sm text-red-600 text-center mb-4'>{error}</p>
        )}

        <div className='flex gap-3'>
          <button onClick={handleCancel}
            className='flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-semibold min-h-[48px] hover:bg-gray-200 transition-colors'>
            Cancel
          </button>
          <button
            disabled={loading || pin.length !== 4}
            onClick={() => { void handleSubmit() }}
            className='flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[48px] hover:bg-blue-700 disabled:opacity-50 transition-colors'>
            {loading ? 'Verifying…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
