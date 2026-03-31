import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { resetPassword } from '../../api/auth'

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm:  z.string().min(1, 'Please confirm your password'),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path:    ['confirm'],
})

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const { token }  = useParams<{ token: string }>()
  const navigate   = useNavigate()

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!token) navigate('/forgot-password', { replace: true })
  }, [token, navigate])

  async function onSubmit(data: FormData) {
    try {
      await resetPassword(token!, data.password)
      toast.success('Password updated — please sign in')
      navigate('/login', { replace: true })
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Reset link is invalid or has expired',
      })
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-gray-900 mb-1'>Set a new password</h1>
        <p className='text-sm text-gray-500 mb-6'>Choose a strong password for your account.</p>

        <form onSubmit={e => { void handleSubmit(onSubmit)(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>New password</label>
            <input
              type='password'
              autoFocus
              {...register('password')}
              placeholder='At least 8 characters'
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            {errors.password && <p className='text-xs text-red-600 mt-1'>{errors.password.message}</p>}
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Confirm password</label>
            <input
              type='password'
              {...register('confirm')}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            {errors.confirm && <p className='text-xs text-red-600 mt-1'>{errors.confirm.message}</p>}
          </div>

          {errors.root && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{errors.root.message}</p>
          )}

          <button
            type='submit'
            disabled={isSubmitting}
            className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'
          >
            {isSubmitting ? 'Saving…' : 'Set new password'}
          </button>

          <Link to='/forgot-password' className='block text-center text-sm text-gray-500 hover:underline'>
            Request a new link
          </Link>
        </form>
      </div>
    </div>
  )
}
