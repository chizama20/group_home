import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Home, Save } from 'lucide-react'
import { createHome } from '../../api/homes'

export default function HomeForm() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await createHome({ name: name.trim(), address: address.trim() || undefined })
      if (res.data.success && res.data.data) {
        navigate(`/homes/${res.data.data.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create home')
      setSaving(false)
    }
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black pb-8'>
      <div className='max-w-4xl mx-auto'>
        {/* Back button */}
        <div className='flex items-center gap-2 px-4 pt-5 pb-3'>
          <button
            onClick={() => navigate('/homes')}
            className='flex items-center gap-1 min-h-[44px]'
            aria-label='Back to homes'
          >
            <ChevronLeft className='h-5 w-5 text-zinc-500' />
            <span className='text-sm text-zinc-500 dark:text-zinc-400 font-medium'>Homes</span>
          </button>
        </div>

        {/* Header */}
        <div className='px-4 flex items-start gap-3 mb-6'>
          <div className='w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0'>
            <Home className='h-6 w-6' />
          </div>
          <div>
            <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>
              New Home
            </h1>
            <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-0.5'>
              Add a new home to your organization
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='mx-4'>
          <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-4'>
            {/* Name */}
            <div>
              <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
                Name <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='e.g., Sunrise House'
                autoFocus
                className='w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]'
              />
            </div>

            {/* Address */}
            <div>
              <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
                Address
              </label>
              <input
                type='text'
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder='e.g., 123 Main Street, City, State 12345'
                className='w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]'
              />
            </div>

            {/* Error */}
            {error && (
              <p className='text-sm text-red-500'>{error}</p>
            )}

            {/* Submit button */}
            <button
              type='submit'
              disabled={saving || !name.trim()}
              className='w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-3 rounded-xl min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Save className='h-4 w-4' />
              {saving ? 'Creating...' : 'Create Home'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
