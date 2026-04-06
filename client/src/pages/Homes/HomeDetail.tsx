import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Home } from 'lucide-react'
import { getHomes, type Home as HomeType } from '../../api/homes'
import { cn } from '../../lib/cn'
import ResidentsTab from './tabs/ResidentsTab'
import StaffTab from './tabs/StaffTab'
import ScheduleTab from './tabs/ScheduleTab'
import SettingsTab from './tabs/SettingsTab'

const TABS = ['residents', 'staff', 'schedule', 'settings'] as const
type Tab = typeof TABS[number]

const TAB_LABELS: Record<Tab, string> = {
  residents: 'Residents',
  staff:     'Staff',
  schedule:  'Schedule',
  settings:  'Settings',
}

export default function HomeDetail() {
  const { id }              = useParams<{ id: string }>()
  const navigate            = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [home, setHome]     = useState<HomeType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  // Get tab from URL or default to 'residents'
  const tabParam = searchParams.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(
    tabParam && TABS.includes(tabParam) ? tabParam : 'residents'
  )

  // Sync tab with URL
  useEffect(() => {
    const p = searchParams.get('tab') as Tab | null
    if (p && TABS.includes(p)) setTab(p)
  }, [searchParams])

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    setSearchParams({ tab: newTab })
  }

  const fetchHome = useCallback(async () => {
    if (!id) return
    try {
      const res = await getHomes()
      if (res.data.success && res.data.data) {
        const found = res.data.data.find(h => h.id === id)
        if (found) {
          setHome(found)
        } else {
          setError('Home not found')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load home')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchHome()
  }, [fetchHome])

  if (loading) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center'>
        <div className='w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-black px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400'>
        {error}
      </div>
    )
  }

  if (!home) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-black px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400'>
        Home not found
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black pb-8'>
      <div className='max-w-4xl mx-auto'>
        {/* Back button */}
        <div className='flex items-center gap-2 px-4 pt-5 pb-3'>
          <button
            onClick={() => navigate('/homes')}
            className='flex items-center gap-1 min-h-[44px]'
            aria-label='Back to homes'
          >
            <ChevronLeft className='h-5 w-5 text-zinc-500' />
            <span className='text-sm text-zinc-500 dark:text-zinc-400 font-medium'>Homes</span>
          </button>
        </div>

        {/* Home header */}
        <div className='px-4 flex items-start gap-3'>
          <div className='w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0'>
            <Home className='h-6 w-6' />
          </div>
          <div className='flex-1 min-w-0'>
            <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>
              {home.name}
            </h1>
            {home.address && (
              <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-0.5'>
                {home.address}
              </p>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div
          className='flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 mt-5 overflow-x-auto'
          style={{ scrollbarWidth: 'none' }}
        >
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={cn(
                'flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px]',
                tab === t
                  ? 'border-indigo-500 text-zinc-900 dark:text-white'
                  : 'border-transparent text-zinc-500'
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'residents' && <ResidentsTab homeId={home.id} />}
        {tab === 'staff' && <StaffTab homeId={home.id} />}
        {tab === 'schedule' && <ScheduleTab homeId={home.id} />}
        {tab === 'settings' && <SettingsTab home={home} onUpdate={fetchHome} />}
      </div>
    </div>
  )
}
