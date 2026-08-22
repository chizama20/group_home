import { useState } from 'react'
import { X, Bell } from 'lucide-react'
import { updateNotificationPrefs } from '../api/users'
import { useAuth } from '../context/AuthContext'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

const DEFAULT_PREFS = { announcements: true, schedule_changes: true, trade_claimed: true }

const TOGGLES: { key: keyof typeof DEFAULT_PREFS; label: string; description: string }[] = [
  { key: 'schedule_changes', label: 'Schedule changes', description: 'Time-off request updates and approvals' },
  { key: 'trade_claimed',    label: 'Shift trades',       description: 'When one of your offered shifts is claimed' },
  { key: 'announcements',    label: 'Announcements',      description: 'New posts from management' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${checked ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}

export default function NotificationPrefsSheet({ onSuccess, onCancel }: Props) {
  const { user, refreshUser } = useAuth()
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS, ...(user?.notification_prefs ?? {}) })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await updateNotificationPrefs(prefs)
      if (res.data.success) {
        await refreshUser()
        onSuccess()
      } else {
        setError(res.data.error?.message ?? 'Failed to save preferences')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 pb-8 max-h-[92vh] overflow-y-auto'>
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />

        <div className='px-4 pt-4'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2'>
              <Bell className='w-4 h-4 text-zinc-400' />
              Notifications
            </h2>
            <button
              onClick={onCancel}
              className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
            >
              <X className='w-5 h-5 text-zinc-500 dark:text-zinc-400' />
            </button>
          </div>

          <div className='space-y-1'>
            {TOGGLES.map(t => (
              <div
                key={t.key}
                className='flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0'
              >
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-zinc-900 dark:text-white'>{t.label}</p>
                  <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>{t.description}</p>
                </div>
                <Toggle
                  checked={prefs[t.key]}
                  onChange={() => setPrefs(p => ({ ...p, [t.key]: !p[t.key] }))}
                />
              </div>
            ))}
          </div>

          {error && (
            <p className='mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg'>
              {error}
            </p>
          )}

          <div className='flex gap-3 pt-5'>
            <button
              type='button'
              onClick={onCancel}
              className='flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 min-h-[44px] transition-colors'
            >
              Cancel
            </button>
            <button
              type='button'
              disabled={submitting}
              onClick={() => { void handleSave() }}
              className='flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-primary/90 disabled:opacity-50 transition-colors'
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
