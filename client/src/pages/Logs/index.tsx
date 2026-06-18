import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import HomeSwitcherStrip from '../../components/HomeSwitcherStrip'
import { useHome } from '../../context/HomeContext'
import { useResidents } from '../../hooks/useResidents'
import { useRole } from '../../utils/role'
import { cn } from '../../lib/cn'
import IposTab       from './IposTab'
import BehavioralTab from './BehavioralTab'
import IncidentTab   from './IncidentTab'
import ExportSheet   from './ExportSheet'
import ReviewQueueTab from './ReviewQueueTab'
import MedsTab        from './MedsTab'
import ShiftNotesTab  from './ShiftNotesTab'

type LogTab = 'ipos' | 'behavioral' | 'incident' | 'review' | 'meds' | 'shift-notes'

export default function LogsPage() {
  const [searchParams]        = useSearchParams()
  const { homeId }            = useHome()
  const { residents }         = useResidents(homeId)
  const { isManagerOrAbove }  = useRole()
  const [showExport, setShowExport] = useState(false)
  const [showFab, setShowFab] = useState(false)

  const TABS: { id: LogTab; label: string }[] = [
    { id: 'ipos',       label: 'IPOS' },
    { id: 'behavioral', label: 'Behavioral' },
    { id: 'incident',   label: 'Incidents' },
    { id: 'meds',        label: 'Meds' },
    { id: 'shift-notes', label: 'Shift Notes' },
    ...(isManagerOrAbove ? [{ id: 'review' as LogTab, label: 'Review Queue' }] : []),
  ]

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
    <div className='min-h-screen bg-zinc-50 dark:bg-black pb-8'>
      <div className='max-w-4xl mx-auto'>
      {/* Header */}
      <div className='px-4 pt-5 pb-0'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Logs</h1>
          {isManagerOrAbove && homeId && (
            <button
              onClick={() => setShowExport(true)}
              className='text-sm font-medium text-primary dark:text-primary border border-primary dark:border-primary/50 rounded-xl px-3 py-2 min-h-[40px] transition-colors'
            >
              Export
            </button>
          )}
        </div>
      </div>

      <HomeSwitcherStrip />

      {/* Tab bar */}
      <div className='flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 mt-3'>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px]',
              tab === t.id
                ? 'border-primary text-zinc-900 dark:text-white'
                : 'border-transparent text-zinc-500'
            )}
          >
            {t.id === 'ipos' && (
              <span className='w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0' />
            )}
            {t.label}
            {t.id === 'incident' && (
              <span className='w-1.5 h-1.5 rounded-full bg-red-500 shrink-0' />
            )}
          </button>
        ))}
      </div>

      {!homeId && (
        <p className='p-4 text-sm text-zinc-500'>No home selected</p>
      )}

      {homeId && (
        <div className='flex-1'>
          {tab === 'ipos'       && <IposTab       homeId={homeId} residents={residents} showFab={showFab} onFabHandled={() => setShowFab(false)} />}
          {tab === 'behavioral' && <BehavioralTab homeId={homeId} residents={residents} />}
          {tab === 'incident'   && <IncidentTab   homeId={homeId} residents={residents} showFab={showFab} onFabHandled={() => setShowFab(false)} />}
          {tab === 'meds'        && <MedsTab homeId={homeId} />}
          {tab === 'shift-notes' && <ShiftNotesTab homeId={homeId} residents={residents} />}
          {tab === 'review'     && <ReviewQueueTab homeId={homeId} />}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowFab(true)}
        className='fixed bottom-4 right-4 md:bottom-6 md:right-6 z-30 w-14 h-14 bg-primary rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center'
        aria-label='New log'
      >
        <Plus size={22} color='white' />
      </button>

      {showExport && homeId && (
        <ExportSheet
          homeId={homeId}
          residents={residents}
          onClose={() => setShowExport(false)}
        />
      )}
      </div>
    </div>
  )
}
