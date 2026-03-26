import { useEffect, useState } from 'react'
import { useHome } from '../../context/HomeContext'
import { getHomeIncidents } from '../../api/incidents'

interface HomeStat {
  id: string
  name: string
  address: string | null
  openIncidents: number
}

export default function OtherHomesSummary() {
  const { homes, homeId, selectHome } = useHome()
  const [stats, setStats]             = useState<HomeStat[]>([])

  const otherHomes = homes.filter(h => h.id !== homeId)

  useEffect(() => {
    if (!otherHomes.length) return
    Promise.allSettled(
      otherHomes.map(h =>
        getHomeIncidents(h.id, { status: 'open' }).then(res => ({
          id:            h.id,
          name:          h.name,
          address:       h.address,
          openIncidents: res.data.data?.length ?? 0,
        }))
      )
    ).then(results => {
      setStats(results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<HomeStat>).value))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId, homes.length])

  if (!otherHomes.length) return null

  return (
    <div className='mx-4 mt-4 mb-2'>
      <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Other Homes</p>
      <div className='space-y-2'>
        {otherHomes.map(home => {
          const stat = stats.find(s => s.id === home.id)
          return (
            <button
              key={home.id}
              onClick={() => selectHome(home.id)}
              className='w-full bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between text-left min-h-[56px] active:bg-gray-50'
            >
              <div className='min-w-0'>
                <p className='text-sm font-medium text-gray-900 truncate'>{home.name}</p>
                {home.address && (
                  <p className='text-xs text-gray-500 mt-0.5 truncate'>{home.address}</p>
                )}
              </div>
              <div className='flex items-center gap-2 ml-3 shrink-0'>
                {stat && stat.openIncidents > 0 && (
                  <span className='text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full'>
                    {stat.openIncidents} incident{stat.openIncidents !== 1 ? 's' : ''}
                  </span>
                )}
                <span className='text-gray-400 text-sm'>›</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
