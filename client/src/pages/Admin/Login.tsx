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
      sessionStorage.setItem('admin_authed', '1')
      navigate('/admin/dashboard', { replace: true })
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6'>
        <h1 className='text-xl font-bold text-zinc-900 dark:text-white mb-1'>Admin Panel</h1>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6'>Internal access only</p>

        <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Email</label>
            <input type='email' required autoFocus value={email} onChange={e => setEmail(e.target.value)}
              className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary' />
          </div>
          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Password</label>
            <input type='password' required value={password} onChange={e => setPassword(e.target.value)}
              className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary' />
          </div>

          {error && (
            <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg'>{error}</p>
          )}

          <button type='submit' disabled={loading}
            className='w-full bg-primary text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-primary disabled:opacity-50 transition-colors'>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
