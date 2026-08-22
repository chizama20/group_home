import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import HomeSwitcherStrip from '../../components/HomeSwitcherStrip'
import RecentChangesPanel from '../../components/RecentChangesPanel'
import InviteStaffWizard from '../../components/InviteStaffWizard'
import { useHome } from '../../context/HomeContext'
import { cn } from '../../lib/cn'
import StaffTab from '../Homes/tabs/StaffTab'
import ScheduleTab from '../Homes/tabs/ScheduleTab'

type PageTab = 'roster' | 'scheduling'

const TABS: { id: PageTab; label: string }[] = [
  { id: 'roster',     label: 'Roster' },
  { id: 'scheduling', label: 'Scheduling' },
]

export default function StaffPage() {
  const { homeId } = useHome()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = (searchParams.get('tab') as PageTab | null) ?? 'roster'
  const [tab, setTab] = useState<PageTab>(TABS.some(t => t.id === initialTab) ? initialTab : 'roster')
  const [showInvite, setShowInvite] = useState(false)

  function handleTabChange(newTab: PageTab) {
    setTab(newTab)
    setSearchParams({ tab: newTab })
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-8'>
      <div className='max-w-4xl mx-auto'>
        <HomeSwitcherStrip />

        <div className='px-4 pt-5 pb-3 flex items-center justify-between'>
          <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Staff</h1>
          <button
            onClick={() => setShowInvite(true)}
            className='flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-3 py-2 rounded-md min-h-[40px]'
          >
            <UserPlus className='h-4 w-4' />
            Invite Staff
          </button>
        </div>

        {/* Tab bar */}
        <div className='flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4'>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={cn(
                'flex-1 sm:flex-none sm:px-6 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px]',
                tab === t.id
                  ? 'border-primary text-zinc-900 dark:text-white'
                  : 'border-transparent text-zinc-500'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!homeId ? (
          <div className='mx-4 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center'>
            <p className='text-sm text-zinc-500 dark:text-zinc-400'>Select a home to manage its staff.</p>
          </div>
        ) : (
          <>
            {tab === 'roster' && <StaffTab homeId={homeId} />}
            {tab === 'scheduling' && (
              <div className='space-y-4'>
                <ScheduleTab homeId={homeId} />
                <div className='px-4'>
                  <RecentChangesPanel />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showInvite && (
        <InviteStaffWizard
          onSuccess={() => setShowInvite(false)}
          onCancel={() => setShowInvite(false)}
        />
      )}
    </div>
  )
}
