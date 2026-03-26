import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import { useSelectedHome } from '../../hooks/useSelectedHome'
import { useResidents } from '../../hooks/useResidents'
import { cn } from '../../lib/cn'
import IposTab       from './IposTab'
import BehavioralTab from './BehavioralTab'
import IncidentTab   from './IncidentTab'

type LogTab = 'ipos' | 'behavioral' | 'incident'

const TABS: { id: LogTab; label: string }[] = [
  { id: 'ipos',       label: 'IPOS' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'incident',   label: 'Incident' },
]

export default function LogsPage() {
  const [searchParams]              = useSearchParams()
  const { homeId, homes, selectHome } = useSelectedHome()
  const { residents }               = useResidents(homeId)

  const initialTab = (searchParams.get('tab') as LogTab | null) ?? 'ipos'
  const [tab, setTab] = useState<LogTab>(
    TABS.some(t => t.id === initialTab) ? initialTab : 'ipos'
  )

  // Sync tab if URL param changes (e.g. Quick Actions → /logs?tab=incident)
  useEffect(() => {
    const p = searchParams.get('tab') as LogTab | null
    if (p && TABS.some(t => t.id === p)) setTab(p)
  }, [searchParams])

  return (
    <div className='pb-20 min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white px-4 pt-5 pb-0 border-b border-gray-200'>
        <div className='flex items-center justify-between mb-3'>
          <h1 className='text-xl font-bold text-gray-900'>Logs</h1>
          {homes.length > 1 && (
            <select
              value={homeId ?? ''}
              onChange={e => selectHome(e.target.value)}
              className='border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white min-h-[36px]'
            >
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
        </div>

        {/* Sub-nav tabs */}
        <div className='flex gap-1'>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap min-h-[44px] border-b-2 transition-colors',
                tab === t.id
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!homeId && (
        <p className='p-4 text-sm text-gray-500'>No home selected</p>
      )}

      {homeId && (
        <>
          {tab === 'ipos'       && <IposTab       homeId={homeId} residents={residents} />}
          {tab === 'behavioral' && <BehavioralTab homeId={homeId} residents={residents} />}
          {tab === 'incident'   && <IncidentTab   homeId={homeId} residents={residents} />}
        </>
      )}

      <BottomNav />
    </div>
  )
}
