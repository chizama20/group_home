import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getInvite, acceptInvite } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'

interface InviteInfo {
  email:    string
  role:     'employee' | 'manager'
  org_name: string
}

const ROLE_LABELS: Record<string, string> = {
  employee: 'Employee',
  manager:  'Manager',
}

const schema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name:  z.string().min(1, 'Last name is required').max(100),
  password:   z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

export default function InviteAcceptPage() {
  const { token }   = useParams<{ token: string }>()
  const navigate    = useNavigate()
  const { setUser } = useAuth()

  const [invite, setInvite]           = useState<InviteInfo | null>(null)
  const [tokenError, setTokenError]   = useState<string | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!token) {
      setTokenError('Invalid invite link')
      setLoadingInvite(false)
      return
    }
    getInvite(token)
      .then(res => {
        if (res.data.success && res.data.data) setInvite(res.data.data)
        else setTokenError('This invite link is invalid or has expired')
      })
      .catch(() => setTokenError('This invite link is invalid or has expired'))
      .finally(() => setLoadingInvite(false))
  }, [token])

  async function onSubmit(data: FormData) {
    try {
      const res = await acceptInvite(token!, data)
      if (!res.data.success || !res.data.data) throw new Error('Failed to accept invite')
      setUser(res.data.data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Failed to accept invite',
      })
    }
  }

  if (loadingInvite) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin' />
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
        <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6 text-center'>
          <p className='text-sm text-red-600 mb-2'>{tokenError}</p>
          <p className='text-xs text-gray-400'>Contact your administrator for a new invite.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-gray-900 mb-1'>Accept your invitation</h1>
        <p className='text-sm text-gray-500 mb-4'>
          You've been invited to join <strong>{invite?.org_name}</strong>
        </p>

        {/* Role shown read-only */}
        <div className='bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-6'>
          <span className='text-xs text-gray-500 uppercase tracking-wide'>Role</span>
          <p className='text-sm font-semibold text-gray-800 mt-0.5'>
            {ROLE_LABELS[invite?.role ?? ''] ?? invite?.role}
          </p>
        </div>

        <form onSubmit={e => { void handleSubmit(onSubmit)(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>First name</label>
            <input
              type='text'
              autoFocus
              {...register('first_name')}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            {errors.first_name && <p className='text-xs text-red-600 mt-1'>{errors.first_name.message}</p>}
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Last name</label>
            <input
              type='text'
              {...register('last_name')}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            {errors.last_name && <p className='text-xs text-red-600 mt-1'>{errors.last_name.message}</p>}
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Password <span className='text-gray-400 font-normal'>(min. 8 characters)</span>
            </label>
            <input
              type='password'
              {...register('password')}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            {errors.password && <p className='text-xs text-red-600 mt-1'>{errors.password.message}</p>}
          </div>

          {errors.root && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{errors.root.message}</p>
          )}

          <button
            type='submit'
            disabled={isSubmitting}
            className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className='text-xs text-gray-400 text-center mt-4'>
          Your account email: <strong>{invite?.email}</strong>
        </p>
      </div>
    </div>
  )
}
