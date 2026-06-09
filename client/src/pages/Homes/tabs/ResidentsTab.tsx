import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, User } from 'lucide-react'
import { getResidents } from '../../../api/residents'
import type { Resident } from '../../../types/resident'

interface Props {
  homeId: string
}

function getInitials(r: Resident) {
  return `${r.first_name[0] ?? ''}${r.last_name[0] ?? ''}`
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

function ResidentRow({ resident, isFirst }: { resident: Resident; isFirst: boolean }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/residents/${resident.id}`)}
      className={`flex items-center gap-3 px-4 py-3.5 min-h-[56px] cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/50${
        isFirst ? '' : ' border-t border-zinc-100 dark:border-zinc-800'
      }`}
    >
      {/* Avatar */}
      <div className='w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0'>
        {getInitials(resident)}
      </div>

      {/* Info */}
      <div className='flex-1 min-w-0'>
        <p className='text-[15px] font-semibold text-zinc-900 dark:text-white'>
          {resident.first_name} {resident.last_name}
        </p>
        {resident.room && (
          <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
            Room {resident.room}
          </p>
        )}
      </div>

      {/* Status badge */}
      {resident.is_active ? (
        <span className='bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full'>
          Active
        </span>
      ) : (
        <span className='bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-[10px] font-semibold px-2 py-0.5 rounded-full'>
          Inactive
        </span>
      )}

      <ChevronRight className='h-4 w-4 text-zinc-300 dark:text-zinc-700 ml-1' />
    </div>
  )
}

export default function ResidentsTab({ homeId }: Props) {
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await getResidents(homeId)
        if (res.data.success && res.data.data) {
          // Sort: active first, then by name
          const sorted = [...res.data.data].sort((a, b) => {
            if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
            return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
          })
          setResidents(sorted)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load residents')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [homeId])

  if (loading) {
    return (
      <div className='p-4'>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-4'>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4'>
          <p className='text-sm text-red-500'>{error}</p>
        </div>
      </div>
    )
  }

  if (residents.length === 0) {
    return (
      <div className='p-4'>
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center'>
          <div className='w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3'>
            <User className='h-6 w-6 text-zinc-400' />
          </div>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>
            No residents in this home yet.
          </p>
        </div>
      </div>
    )
  }

  const activeCount = residents.filter(r => r.is_active).length
  const inactiveCount = residents.length - activeCount

  return (
    <div className='p-4 space-y-3'>
      {/* Stats */}
      <div className='flex gap-2 text-xs'>
        <span className='bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full font-medium'>
          {activeCount} Active
        </span>
        {inactiveCount > 0 && (
          <span className='bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-2.5 py-1 rounded-full font-medium'>
            {inactiveCount} Inactive
          </span>
        )}
      </div>

      {/* List */}
      <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'>
        {residents.map((resident, idx) => (
          <ResidentRow key={resident.id} resident={resident} isFirst={idx === 0} />
        ))}
      </div>
    </div>
  )
}
