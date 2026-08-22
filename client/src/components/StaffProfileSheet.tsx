import { useState } from 'react'
import { X } from 'lucide-react'
import { deactivateUser } from '../api/orgs'
import { removeStaff } from '../api/homes'

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_active: boolean
}

interface Props {
  open: boolean
  homeId: string
  staff: StaffMember
  onClose: () => void
  onChanged: () => void
}

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function getAvatarColors(role: string): string {
  return role === 'admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
}

function RoleBadge({ role }: { role: string }) {
  return role === 'admin' ? (
    <span className='border border-amber-500/30 text-amber-400/70 text-[10px] font-medium px-2 py-0.5 rounded-full'>
      Admin
    </span>
  ) : (
    <span className='border border-zinc-600/40 text-zinc-400 text-[10px] font-medium px-2 py-0.5 rounded-full'>
      Staff
    </span>
  )
}

type ActionConfirm = 'remove' | 'deactivate' | null

export default function StaffProfileSheet({ open, homeId, staff, onClose, onChanged }: Props) {
  const [confirmAction, setConfirmAction] = useState<ActionConfirm>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleRemove() {
    setLoading('remove')
    setError(null)
    try {
      const res = await removeStaff(homeId, staff.id)
      if (res.data.success) {
        onChanged()
        onClose()
      } else {
        setError('Failed to remove staff from home')
        setConfirmAction(null)
      }
    } catch {
      setError('Failed to remove staff from home')
      setConfirmAction(null)
    } finally {
      setLoading(null)
    }
  }

  async function handleDeactivate() {
    setLoading('deactivate')
    setError(null)
    try {
      const res = await deactivateUser(staff.id)
      if (res.data.success) {
        onChanged()
        onClose()
      } else {
        setError('Failed to deactivate account')
        setConfirmAction(null)
      }
    } catch {
      setError('Failed to deactivate account')
      setConfirmAction(null)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onClose} />

      {/* Slide-up panel */}
      <div className='fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-xl z-50 max-h-[75vh] overflow-y-auto'>
        {/* Drag handle pill */}
        <div className='w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3' />

        <div className='px-4 pt-4 pb-8'>
          {/* Header row: avatar + name/email/role + close */}
          <div className='flex items-start justify-between mb-5'>
            <div className='flex items-center gap-3'>
              {/* Avatar with role-color */}
              <div
                className={`w-12 h-12 rounded-full text-base font-bold flex items-center justify-center shrink-0 ${getAvatarColors(staff.role)}`}
              >
                {getInitials(staff.first_name, staff.last_name)}
              </div>
              {/* Name + email + role badge */}
              <div>
                <p className='text-[16px] font-semibold text-zinc-900 dark:text-white leading-tight'>
                  {staff.first_name} {staff.last_name}
                </p>
                <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-[180px]'>
                  {staff.email}
                </p>
                <div className='mt-1.5'>
                  <RoleBadge role={staff.role} />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0'
              aria-label='Close'
            >
              <X className='w-5 h-5 text-zinc-500 dark:text-zinc-400' />
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg mb-4'>
              {error}
            </p>
          )}

          {/* Action buttons */}
          <div className='space-y-2.5'>

            {/* 1. Remove from Home */}
            <div className='bg-zinc-50 dark:bg-zinc-800/50 rounded-lg overflow-hidden'>
              {confirmAction === 'remove' ? (
                <div className='px-4 py-3 space-y-3'>
                  <p className='text-sm text-zinc-700 dark:text-zinc-300'>
                    Remove{' '}
                    <span className='font-semibold'>
                      {staff.first_name} {staff.last_name}
                    </span>{' '}
                    from this home?
                  </p>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className='flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[40px]'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { void handleRemove() }}
                      disabled={loading === 'remove'}
                      className='flex-1 py-2.5 bg-red-600 text-white rounded-md text-sm font-semibold disabled:opacity-50 transition-colors min-h-[40px]'
                    >
                      {loading === 'remove' ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setConfirmAction('remove')
                    setError(null)
                  }}
                  className='w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left min-h-[44px]'
                >
                  Remove from Home
                </button>
              )}
            </div>

            {/* 2. Deactivate Account — only when staff is active */}
            {staff.is_active && (
              <div className='bg-zinc-50 dark:bg-zinc-800/50 rounded-lg overflow-hidden'>
                {confirmAction === 'deactivate' ? (
                  <div className='px-4 py-3 space-y-3'>
                    <p className='text-sm text-zinc-700 dark:text-zinc-300'>
                      Deactivate{' '}
                      <span className='font-semibold'>
                        {staff.first_name} {staff.last_name}
                      </span>
                      's account? They will no longer be able to log in.
                    </p>
                    <div className='flex gap-2'>
                      <button
                        onClick={() => setConfirmAction(null)}
                        className='flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[40px]'
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { void handleDeactivate() }}
                        disabled={loading === 'deactivate'}
                        className='flex-1 py-2.5 bg-red-600 text-white rounded-md text-sm font-semibold disabled:opacity-50 transition-colors min-h-[40px]'
                      >
                        {loading === 'deactivate' ? 'Deactivating...' : 'Deactivate'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setConfirmAction('deactivate')
                      setError(null)
                    }}
                    className='w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left min-h-[44px]'
                  >
                    Deactivate Account
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
