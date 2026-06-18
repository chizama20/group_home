import { useState } from 'react'
import { verifySigningPin } from '../api/users'

interface Props {
  open:      boolean
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
      <div className='absolute inset-0 bg-black/50' onClick={handleCancel} />

      <div className='relative w-full sm:max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-lg shadow-xl p-6 z-10'>
        <h2 className='text-lg font-semibold text-zinc-900 dark:text-white mb-1 text-center'>
          Enter your signing PIN
        </h2>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6'>
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
          className='w-full bg-white dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-4 text-center text-3xl tracking-[0.75em] text-zinc-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-primary mb-4'
          placeholder='••••'
        />

        {error && (
          <p className='text-sm text-red-600 dark:text-red-400 text-center mb-4'>{error}</p>
        )}

        <div className='flex gap-3'>
          <button
            onClick={handleCancel}
            className='flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl py-3 text-sm font-semibold min-h-[48px] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors'
          >
            Cancel
          </button>
          <button
            disabled={loading || pin.length !== 4}
            onClick={() => { void handleSubmit() }}
            className='flex-1 bg-primary text-white rounded-xl py-3 text-sm font-semibold min-h-[48px] hover:bg-primary/90 disabled:opacity-50 transition-colors'
          >
            {loading ? 'Verifying…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
