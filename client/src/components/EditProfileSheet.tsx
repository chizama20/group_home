import { useState } from 'react'
import { X } from 'lucide-react'
import { updateProfile } from '../api/users'
import { useAuth } from '../context/AuthContext'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

export default function EditProfileSheet({ onSuccess, onCancel }: Props) {
  const { user, refreshUser } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'

  const hasChanges =
    firstName !== (user?.first_name ?? '') ||
    lastName !== (user?.last_name ?? '') ||
    email !== (user?.email ?? '') ||
    phone !== (user?.phone ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !hasChanges) return

    setSubmitting(true)
    setError(null)

    try {
      const updates: { first_name?: string; last_name?: string; email?: string; phone?: string } = {}
      if (firstName !== user.first_name) updates.first_name = firstName.trim()
      if (lastName !== user.last_name) updates.last_name = lastName.trim()
      if (email !== user.email) updates.email = email.trim().toLowerCase()
      if (phone !== (user.phone ?? '')) updates.phone = phone.trim()

      const res = await updateProfile(user.id, updates)
      if (res.data.success) {
        await refreshUser()
        onSuccess()
      } else {
        setError(res.data.error?.message ?? 'Failed to update profile')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 pb-8 max-h-[92vh] overflow-y-auto'>
        {/* Drag indicator (mobile) */}
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />

        <div className='px-4 pt-4'>
          {/* Header */}
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-bold text-zinc-900 dark:text-white'>
              Edit Profile
            </h2>
            <button
              onClick={onCancel}
              className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
            >
              <X className='w-5 h-5 text-zinc-500 dark:text-zinc-400' />
            </button>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className={labelClass}>First Name</label>
              <input
                type='text'
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Last Name</label>
              <input
                type='text'
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Phone <span className='font-normal text-zinc-400'>(optional)</span></label>
              <input
                type='tel'
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder='(555) 555-5555'
                className={inputClass}
              />
            </div>

            {error && (
              <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg'>
                {error}
              </p>
            )}

            <div className='flex gap-3 pt-2'>
              <button
                type='button'
                onClick={onCancel}
                className='flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 min-h-[44px] transition-colors'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={!hasChanges || submitting}
                className='flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-primary/90 disabled:opacity-50 transition-colors'
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
