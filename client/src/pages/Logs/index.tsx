import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import HomeSwitcherStrip from '../../components/HomeSwitcherStrip'
import { useHome } from '../../context/HomeContext'
import { useResidents } from '../../hooks/useResidents'
import { useRole } from '../../utils/role'
import { cn } from '../../lib/cn'
import IposTab       from './IposTab'
import BehavioralTab from './BehavioralTab'
import IncidentTab   from './IncidentTab'
import ExportSheet   from './ExportSheet'

type LogTab = 'ipos' | 'behavioral' | 'incident'

const TABS: { id: LogTab; label: string }[] = [
  { id: 'ipos',       label: 'IPOS' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'incident',   label: 'Incident' },
]

export default function LogsPage() {
  const [searchParams]        = useSearchParams()
  const { homeId }            = useHome()
  const { residents }         = useResidents(homeId)
  const { isManagerOrAbove }  = useRole()
  const [showExport, setShowExport] = useState(false)

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
      <div className='bg-white border-b border-gray-200'>
        <div className='px-4 pt-5 pb-0'>
          <div className='flex items-center justify-between mb-3'>
            <h1 className='text-xl font-bold text-gray-900'>Logs</h1>
            {isManagerOrAbove && homeId && (
              <button
                onClick={() => setShowExport(true)}
                className='text-sm font-medium text-blue-600 border border-blue-200 rounded-xl px-3 py-2 min-h-[40px] hover:bg-blue-50 transition-colors'
              >
                Export
              </button>
            )}
          </div>
        </div>
        <HomeSwitcherStrip />

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

      {showExport && homeId && (
        <ExportSheet
          homeId={homeId}
          residents={residents}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
