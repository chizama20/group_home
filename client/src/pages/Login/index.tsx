import { useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../context/AuthContext'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login, user, isLoading } = useAuth()
  const navigate                   = useNavigate()
  const [searchParams]             = useSearchParams()
  const timeoutReason              = searchParams.get('reason') === 'timeout'

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!isLoading && user) navigate('/', { replace: true })
  }, [isLoading, user, navigate])

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin' />
      </div>
    )
  }

  async function onSubmit(data: FormData) {
    try {
      await login(data.email, data.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Invalid email or password',
      })
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6'>
        <h1 className='text-2xl font-bold text-gray-900 mb-1'>Group Home</h1>
        <p className='text-sm text-gray-500 mb-6'>Sign in to continue</p>

        {timeoutReason && (
          <p className='text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-4'>
            You were logged out for security after 15 minutes of inactivity.
          </p>
        )}

        <form onSubmit={e => { void handleSubmit(onSubmit)(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
            <input
              type='email'
              autoFocus
              {...register('email')}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='you@example.com'
            />
            {errors.email && <p className='text-xs text-red-600 mt-1'>{errors.email.message}</p>}
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Password</label>
            <input
              type='password'
              {...register('password')}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            {errors.password && <p className='text-xs text-red-600 mt-1'>{errors.password.message}</p>}
            <div className='text-right mt-1'>
              <Link to='/forgot-password' className='text-xs text-blue-600 hover:underline'>
                Forgot password?
              </Link>
            </div>
          </div>

          {errors.root && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{errors.root.message}</p>
          )}

          <button
            type='submit'
            disabled={isSubmitting}
            className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className='text-xs text-gray-400 text-center mt-6'>
          New organisation?{' '}
          <Link to='/request-access' className='text-blue-600 hover:underline'>
            Request access →
          </Link>
        </p>
      </div>
    </div>
  )
}
