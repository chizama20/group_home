import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../../api/admin'

export default function AdminLoginPage() {
  const navigate              = useNavigate()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await adminLogin(email, password)
      navigate('/admin/dashboard', { replace: true })
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-gray-900 mb-1'>Admin Panel</h1>
        <p className='text-sm text-gray-500 mb-6'>Internal access only</p>

        <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
            <input type='email' required autoFocus value={email} onChange={e => setEmail(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500' />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Password</label>
            <input type='password' required value={password} onChange={e => setPassword(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500' />
          </div>

          {error && <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{error}</p>}

          <button type='submit' disabled={loading}
            className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
