import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import StatusBadge from '../../components/StatusBadge'
import { useSelectedHome } from '../../hooks/useSelectedHome'
import { useResidents } from '../../hooks/useResidents'

export default function ResidentsPage() {
  const navigate = useNavigate()
  const { homes, homeId, selectHome } = useSelectedHome()
  const { residents, loading, error } = useResidents(homeId)
  const [search, setSearch] = useState('')

  const filtered = residents.filter(r =>
    `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='pb-20 min-h-screen bg-gray-50'>
      <div className='bg-white px-4 pt-5 pb-3 border-b border-gray-100'>
        <h1 className='text-xl font-bold text-gray-900 mb-3'>Residents</h1>

        {homes.length > 1 && (
          <select
            value={homeId ?? ''}
            onChange={e => selectHome(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] mb-3 bg-white'
          >
            {homes.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        )}

        <input
          type='search'
          placeholder='Search residents…'
          value={search}
          onChange={e => setSearch(e.target.value)}
          className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px]'
        />
      </div>

      <div className='divide-y divide-gray-100 bg-white'>
        {loading && <p className='p-4 text-sm text-gray-500'>Loading…</p>}
        {error   && <p className='p-4 text-sm text-red-600'>{error}</p>}
        {!loading && !homeId && <p className='p-4 text-sm text-gray-500'>No home selected</p>}

        {filtered.map(r => (
          <button
            key={r.id}
            onClick={() => navigate(`/residents/${r.id}`)}
            className='w-full flex items-center justify-between p-4 text-left min-h-[60px] hover:bg-gray-50'
          >
            <div>
              <p className='font-medium text-gray-900 text-sm'>{r.first_name} {r.last_name}</p>
              {r.room && <p className='text-xs text-gray-500'>Room {r.room}</p>}
            </div>
            {r.status && <StatusBadge status={r.status} />}
          </button>
        ))}

        {!loading && homeId && filtered.length === 0 && !error && (
          <p className='p-4 text-sm text-gray-500'>No residents found</p>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
