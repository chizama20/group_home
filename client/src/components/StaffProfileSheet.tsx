import { useState, useEffect } from 'react'
import { X, Building2, Clock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useHome } from '../context/HomeContext'
import { getOrgStaff, updateUserRole, deactivateUser } from '../api/orgs'
import { removeStaff, type Home } from '../api/homes'
import type { OrgStaffMember } from '../api/orgs'
import type { UserRole } from '../types/auth'

interface Props {
  userId: string
  onClose: () => void
  onUpdate: () => void
}

interface StaffDetails extends OrgStaffMember {
  assigned_homes?: { id: string; name: string }[]
  last_login_at?: string | null
  is_pending?: boolean
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
]

export default function StaffProfileSheet({ userId, onClose, onUpdate }: Props) {
  const { user: currentUser, org } = useAuth()
  const { homes } = useHome()
  const isOrgAdmin = currentUser?.role === 'org_admin'

  const [staff, setStaff] = useState<StaffDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newRole, setNewRole] = useState<UserRole>('employee')
  const [updating, setUpdating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const [selectedHomeToRemove, setSelectedHomeToRemove] = useState<string | null>(null)
  const [removingFromHome, setRemovingFromHome] = useState(false)

  useEffect(() => {
    async function fetchStaff() {
      if (!org) return
      setLoading(true)
      setError(null)

      try {
        const res = await getOrgStaff(org.id)
        if (res.data.success && res.data.data) {
          const found = res.data.data.find((s: OrgStaffMember) => s.id === userId)
          if (found) {
            // Extend with additional details
            // Note: In a real implementation, you might have a separate endpoint
            // for detailed user info. For now, we use what we have.
            const staffDetails: StaffDetails = {
              ...found,
              // These would come from the API in a full implementation
              assigned_homes: homes
                .filter((h: Home) => h.is_active)
                .map((h: Home) => ({ id: h.id, name: h.name })),
              last_login_at: null, // Would come from API
              is_pending: !found.is_active, // Simplistic check
            }
            setStaff(staffDetails)
            setNewRole(found.role)
          } else {
            setError('Staff member not found')
          }
        }
      } catch {
        setError('Failed to load staff details')
      } finally {
        setLoading(false)
      }
    }

    void fetchStaff()
  }, [org, userId, homes])

  async function handleRoleChange() {
    if (!staff || newRole === staff.role) return
    setUpdating(true)
    setActionError(null)

    try {
      await updateUserRole(userId, newRole)
      setStaff(prev => prev ? { ...prev, role: newRole } : null)
      onUpdate()
    } catch {
      setActionError('Failed to update role')
    } finally {
      setUpdating(false)
    }
  }

  async function handleDeactivate() {
    setDeactivating(true)
    setActionError(null)

    try {
      await deactivateUser(userId)
      onUpdate()
      onClose()
    } catch {
      setActionError('Failed to deactivate user')
      setShowDeactivateConfirm(false)
    } finally {
      setDeactivating(false)
    }
  }

  async function handleRemoveFromHome() {
    if (!selectedHomeToRemove) return
    setRemovingFromHome(true)
    setActionError(null)

    try {
      await removeStaff(selectedHomeToRemove, userId)
      setStaff(prev =>
        prev
          ? {
              ...prev,
              assigned_homes: prev.assigned_homes?.filter(h => h.id !== selectedHomeToRemove),
            }
          : null
      )
      setSelectedHomeToRemove(null)
      onUpdate()
    } catch {
      setActionError('Failed to remove from home')
    } finally {
      setRemovingFromHome(false)
    }
  }

  function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  function formatLastLogin(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function getRoleBadgeStyles(role: UserRole): string {
    switch (role) {
      case 'org_admin':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      case 'manager':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    }
  }

  function getRoleLabel(role: UserRole): string {
    switch (role) {
      case 'org_admin':
        return 'Org Admin'
      case 'manager':
        return 'Manager'
      default:
        return 'Employee'
    }
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onClose} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-xl md:rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 pb-8 max-h-[92vh] overflow-y-auto'>
        {/* Drag indicator (mobile) */}
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />

        <div className='px-4 pt-4'>
          {/* Header with close button */}
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-bold text-zinc-900 dark:text-white'>
              Staff Profile
            </h2>
            <button
              onClick={onClose}
              className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
            >
              <X className='w-5 h-5 text-zinc-500 dark:text-zinc-400' />
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className='flex justify-center py-8'>
              <div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className='bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 text-center'>
              <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            </div>
          )}

          {/* Staff details */}
          {staff && !loading && (
            <div className='space-y-4'>
              {/* Profile header */}
              <div className='flex items-center gap-4'>
                <div className='w-16 h-16 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-xl'>
                  {getInitials(staff.first_name, staff.last_name)}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-lg font-semibold text-zinc-900 dark:text-white truncate'>
                    {staff.first_name} {staff.last_name}
                  </p>
                  <p className='text-sm text-zinc-500 dark:text-zinc-400 truncate'>{staff.email}</p>
                  <div className='flex items-center gap-2 mt-1'>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getRoleBadgeStyles(staff.role)}`}>
                      {getRoleLabel(staff.role)}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      staff.is_pending
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : staff.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {staff.is_pending ? 'Pending' : staff.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info section */}
              <div className='bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3'>
                {/* Last login */}
                <div className='flex items-center gap-3'>
                  <Clock className='w-4 h-4 text-zinc-400' />
                  <div>
                    <p className='text-xs text-zinc-500 dark:text-zinc-400'>Last login</p>
                    <p className='text-sm text-zinc-900 dark:text-white'>
                      {formatLastLogin(staff.last_login_at)}
                    </p>
                  </div>
                </div>

                {/* Assigned homes */}
                <div className='flex items-start gap-3'>
                  <Building2 className='w-4 h-4 text-zinc-400 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>Assigned homes</p>
                    {staff.assigned_homes && staff.assigned_homes.length > 0 ? (
                      <div className='flex flex-wrap gap-1'>
                        {staff.assigned_homes.map(home => (
                          <span
                            key={home.id}
                            className='text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full'
                          >
                            {home.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className='text-sm text-zinc-400 dark:text-zinc-500'>No homes assigned</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin actions */}
              {isOrgAdmin && staff.role !== 'org_admin' && (
                <div className='border-t border-zinc-200 dark:border-zinc-700 pt-4 space-y-4'>
                  <p className='text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide'>
                    Admin Actions
                  </p>

                  {/* Change role */}
                  <div>
                    <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
                      Change Role
                    </label>
                    <div className='flex gap-2'>
                      <select
                        value={newRole}
                        onChange={e => setNewRole(e.target.value as UserRole)}
                        className='flex-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      >
                        {ROLE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => { void handleRoleChange() }}
                        disabled={updating || newRole === staff.role}
                        className='px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 transition-colors'
                      >
                        {updating ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>

                  {/* Remove from home */}
                  {staff.assigned_homes && staff.assigned_homes.length > 0 && (
                    <div>
                      <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
                        Remove from Home
                      </label>
                      <div className='flex gap-2'>
                        <select
                          value={selectedHomeToRemove ?? ''}
                          onChange={e => setSelectedHomeToRemove(e.target.value || null)}
                          className='flex-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
                        >
                          <option value=''>Select a home...</option>
                          {staff.assigned_homes.map(home => (
                            <option key={home.id} value={home.id}>
                              {home.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => { void handleRemoveFromHome() }}
                          disabled={removingFromHome || !selectedHomeToRemove}
                          className='px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-red-700 disabled:opacity-50 transition-colors'
                        >
                          {removingFromHome ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Deactivate user */}
                  {!showDeactivateConfirm ? (
                    <button
                      onClick={() => setShowDeactivateConfirm(true)}
                      className='w-full py-3 border border-red-300 dark:border-red-500/30 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 min-h-[44px] transition-colors'
                    >
                      Deactivate User
                    </button>
                  ) : (
                    <div className='bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4'>
                      <div className='flex items-start gap-2 mb-3'>
                        <AlertTriangle className='w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5' />
                        <div>
                          <p className='text-sm font-semibold text-red-600 dark:text-red-400'>
                            Deactivate this user?
                          </p>
                          <p className='text-xs text-red-500 dark:text-red-400/80 mt-1'>
                            They will no longer be able to log in or access any homes.
                          </p>
                        </div>
                      </div>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => setShowDeactivateConfirm(false)}
                          className='flex-1 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 min-h-[44px] transition-colors'
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => { void handleDeactivate() }}
                          disabled={deactivating}
                          className='flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-red-700 disabled:opacity-50 transition-colors'
                        >
                          {deactivating ? 'Deactivating...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action error */}
                  {actionError && (
                    <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg'>
                      {actionError}
                    </p>
                  )}
                </div>
              )}

              {/* Close button for non-admins */}
              {(!isOrgAdmin || staff.role === 'org_admin') && (
                <button
                  onClick={onClose}
                  className='w-full py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 min-h-[44px] transition-colors'
                >
                  Close
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
