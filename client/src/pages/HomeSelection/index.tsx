import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHome } from '../../context/HomeContext'
import { useAuth } from '../../context/AuthContext'
import { getHomeIncidents } from '../../api/incidents'
import type { Home } from '../../api/homes'

interface HomeBadges {
  openIncidents: number
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export default function HomeSelectionPage() {
  const { user }                         = useAuth()
  const { homes, isLoading, selectHome } = useHome()
  const navigate                         = useNavigate()
  const [badges, setBadges]              = useState<Record<string, HomeBadges>>({})

  useEffect(() => {
    if (!homes.length) return
    Promise.allSettled(
      homes.map(h => getHomeIncidents(h.id, { status: 'open' }).then(res => ({
        id: h.id,
        openIncidents: res.data.data?.length ?? 0,
      })))
    ).then(results => {
      const map: Record<string, HomeBadges> = {}
      for (const r of results) {
        if (r.status === 'fulfilled') map[r.value.id] = { openIncidents: r.value.openIncidents }
      }
      setBadges(map)
    })
  }, [homes])

  function handleSelect(home: Home) {
    selectHome(home.id)
    navigate('/', { replace: true })
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center'>
        <div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black'>
      {/* Header */}
      <div className='bg-white dark:bg-zinc-950 px-4 pt-12 pb-5 border-b border-zinc-100 dark:border-zinc-800'>
        <div className='flex items-center gap-3 mb-1'>
          <div className='w-10 h-10 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center shrink-0'>
            {user ? initials(user.first_name, user.last_name) : '?'}
          </div>
          <div>
            <p className='text-xs text-zinc-500 dark:text-zinc-400'>
              {user?.first_name} {user?.last_name}
            </p>
            <p className='text-xs text-primary dark:text-primary font-medium capitalize'>{user?.role.replace('_', ' ')}</p>
          </div>
        </div>
        <h1 className='text-2xl font-bold text-zinc-900 dark:text-white mt-4'>Select a home</h1>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>Choose which home to manage</p>
      </div>

      {/* Home cards */}
      <div className='p-4 space-y-3'>
        {homes.map(home => {
          const b = badges[home.id]
          return (
            <button
              key={home.id}
              onClick={() => handleSelect(home)}
              className='w-full bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 text-left hover:border-primary dark:hover:border-primary hover:shadow-md transition-all min-h-[80px]'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='text-base font-semibold text-zinc-900 dark:text-white'>{home.name}</p>
                  {home.address && (
                    <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate'>{home.address}</p>
                  )}
                </div>
                <span className='text-zinc-400 dark:text-zinc-600 text-xl shrink-0 mt-0.5'>›</span>
              </div>

              {b && b.openIncidents > 0 && (
                <div className='flex gap-2 mt-3 flex-wrap'>
                  <span className='inline-flex items-center gap-1 bg-red-500/10 text-red-500 dark:text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full'>
                    {b.openIncidents} open incident{b.openIncidents !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </button>
          )
        })}

        {homes.length === 0 && (
          <p className='text-sm text-zinc-500 dark:text-zinc-400 text-center py-8'>No homes assigned to your account.</p>
        )}
      </div>
    </div>
  )
}
