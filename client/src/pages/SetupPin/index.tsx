import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { setSigningPin } from '../../api/users'
import { useAuth } from '../../context/AuthContext'

const schema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  pin:              z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  confirm_pin:      z.string().min(1, 'Please confirm your PIN'),
}).refine(d => d.pin === d.confirm_pin, {
  message: 'PINs do not match',
  path:    ['confirm_pin'],
})

type FormData = z.infer<typeof schema>

const PIN_CLS = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-[0.5em] text-center text-lg'

export default function SetupPinPage() {
  const navigate        = useNavigate()
  const { user, setUser } = useAuth()

  const { register, handleSubmit, setValue, watch, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', pin: '', confirm_pin: '' },
  })

  const pinVal     = watch('pin')
  const confirmVal = watch('confirm_pin')

  async function onSubmit(data: FormData) {
    try {
      await setSigningPin(data.current_password, data.pin)
      if (user) setUser({ ...user, pin_set_at: new Date().toISOString() })
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setError('root', {
        message: e?.response?.data?.error?.message ?? 'Failed to set PIN',
      })
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

        <form onSubmit={e => { void handleSubmit(onSubmit)(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Current password</label>
            <input
              type='password'
              autoFocus
              {...register('current_password')}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            {errors.current_password && <p className='text-xs text-red-600 mt-1'>{errors.current_password.message}</p>}
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Choose a 4-digit PIN</label>
            <input
              type='password'
              inputMode='numeric'
              maxLength={4}
              value={pinVal}
              onChange={e => setValue('pin', e.target.value.replace(/\D/g, '').slice(0, 4), { shouldValidate: true })}
              className={PIN_CLS}
              placeholder='••••'
            />
            {errors.pin && <p className='text-xs text-red-600 mt-1'>{errors.pin.message}</p>}
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Confirm PIN</label>
            <input
              type='password'
              inputMode='numeric'
              maxLength={4}
              value={confirmVal}
              onChange={e => setValue('confirm_pin', e.target.value.replace(/\D/g, '').slice(0, 4), { shouldValidate: true })}
              className={PIN_CLS}
              placeholder='••••'
            />
            {errors.confirm_pin && <p className='text-xs text-red-600 mt-1'>{errors.confirm_pin.message}</p>}
          </div>

          {errors.root && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{errors.root.message}</p>
          )}

          <button
            type='submit'
            disabled={isSubmitting}
            className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'
          >
            {isSubmitting ? 'Saving…' : 'Set PIN'}
          </button>
        </form>
      </div>
    </div>
  )
}
