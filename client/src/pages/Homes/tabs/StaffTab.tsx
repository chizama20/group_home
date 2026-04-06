import { useState, useEffect } from 'react'
import { UserPlus, Users, X } from 'lucide-react'
import { getHomeStaff, addStaff, removeStaff, type HomeStaffMember } from '../../../api/homes'
import { getOrgStaff, type OrgStaffMember } from '../../../api/orgs'
import { useAuth } from '../../../context/AuthContext'

interface Props {
  homeId: string
}

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'org_admin':
      return (
        <span className='bg-amber-500/10 text-amber-400 text-[10px] font-semibold px-2 py-0.5 rounded-full'>
          Org Admin
        </span>
      )
    case 'manager':
      return (
        <span className='bg-violet-500/10 text-violet-400 text-[10px] font-semibold px-2 py-0.5 rounded-full'>
          Manager
        </span>
      )
    default:
      return (
        <span className='bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-[10px] font-semibold px-2 py-0.5 rounded-full'>
          Employee
        </span>
      )
  }
}

function SkeletonRow() {
  return (
    <div className='flex items-center gap-3 px-4 py-3.5'>
      <div className='w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse' />
      <div className='flex-1 space-y-2'>
        <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-1/2' />
        <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-1/3' />
      </div>
    </div>
  )
}

function StaffRow({
  staff,
  isFirst,
  onRemove,
  removing,
}: {
  staff: HomeStaffMember
  isFirst: boolean
  onRemove: () => void
  removing: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 min-h-[56px]${
        isFirst ? '' : ' border-t border-zinc-100 dark:border-zinc-800'
      }`}
    >
      {/* Avatar */}
      <div className='w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 text-sm font-bold flex items-center justify-center shrink-0'>
        {getInitials(staff.first_name, staff.last_name)}
      </div>

      {/* Info */}
      <div className='flex-1 min-w-0'>
        <p className='text-[15px] font-semibold text-zinc-900 dark:text-white'>
          {staff.first_name} {staff.last_name}
        </p>
        <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
          {staff.email}
        </p>
      </div>

      {/* Role badge */}
      {getRoleBadge(staff.role)}

      {/* Remove button */}
      <button
        onClick={onRemove}
        disabled={removing}
        className='p-2 text-zinc-400 hover:text-red-500 disabled:opacity-50'
        aria-label='Remove staff'
      >
        <X className='h-4 w-4' />
      </button>
    </div>
  )
}

export default function StaffTab({ homeId }: Props) {
  const { org } = useAuth()
  const [staff, setStaff] = useState<HomeStaffMember[]>([])
  const [orgStaff, setOrgStaff] = useState<OrgStaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  async function fetchStaff() {
    try {
      const res = await getHomeStaff(homeId)
      if (res.data.success && res.data.data) {
        setStaff(res.data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  async function fetchOrgStaff() {
    if (!org?.id) return
    try {
      const res = await getOrgStaff(org.id)
      if (res.data.success && res.data.data) {
        setOrgStaff(res.data.data.filter(s => s.is_active))
      }
    } catch {
      // Non-critical
    }
  }

  useEffect(() => {
    fetchStaff()
    fetchOrgStaff()
  }, [homeId, org?.id])

  async function handleAssign(userId: string) {
    setAssigning(true)
    try {
      await addStaff(homeId, userId)
      await fetchStaff()
      setShowAssign(false)
    } catch {
      // Handle error silently
    } finally {
      setAssigning(false)
    }
  }

  async function handleRemove(userId: string) {
    setRemoving(userId)
    try {
      await removeStaff(homeId, userId)
      setStaff(prev => prev.filter(s => s.id !== userId))
    } catch {
      // Handle error silently
    } finally {
      setRemoving(null)
    }
  }

  // Get available staff (not already assigned)
  const assignedIds = new Set(staff.map(s => s.id))
  const availableStaff = orgStaff.filter(s => !assignedIds.has(s.id))

  if (loading) {
    return (
      <div className='p-4'>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden'>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-4'>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4'>
          <p className='text-sm text-red-500'>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='p-4 space-y-3'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <span className='text-xs text-zinc-500 dark:text-zinc-400'>
          {staff.length} staff member{staff.length !== 1 ? 's' : ''} assigned
        </span>
        <button
          onClick={() => setShowAssign(true)}
          className='flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-3 py-2 rounded-xl min-h-[40px]'
        >
          <UserPlus className='h-4 w-4' />
          Assign Staff
        </button>
      </div>

      {/* Staff list */}
      {staff.length === 0 ? (
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center'>
          <div className='w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3'>
            <Users className='h-6 w-6 text-zinc-400' />
          </div>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>
            No staff assigned to this home yet.
          </p>
        </div>
      ) : (
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden'>
          {staff.map((s, idx) => (
            <StaffRow
              key={s.id}
              staff={s}
              isFirst={idx === 0}
              onRemove={() => handleRemove(s.id)}
              removing={removing === s.id}
            />
          ))}
        </div>
      )}

      {/* Assign modal */}
      {showAssign && (
        <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center'>
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setShowAssign(false)}
          />
          <div className='relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-4 max-h-[80vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-zinc-900 dark:text-white'>
                Assign Staff
              </h3>
              <button
                onClick={() => setShowAssign(false)}
                className='p-2 text-zinc-400 hover:text-zinc-600'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            {availableStaff.length === 0 ? (
              <p className='text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center'>
                All staff members are already assigned to this home.
              </p>
            ) : (
              <div className='space-y-2'>
                {availableStaff.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleAssign(s.id)}
                    disabled={assigning}
                    className='w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors disabled:opacity-50'
                  >
                    <div className='w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 text-sm font-bold flex items-center justify-center shrink-0'>
                      {getInitials(s.first_name, s.last_name)}
                    </div>
                    <div className='flex-1 text-left min-w-0'>
                      <p className='text-sm font-medium text-zinc-900 dark:text-white'>
                        {s.first_name} {s.last_name}
                      </p>
                      <p className='text-xs text-zinc-500 dark:text-zinc-400 truncate'>
                        {s.email}
                      </p>
                    </div>
                    {getRoleBadge(s.role)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
