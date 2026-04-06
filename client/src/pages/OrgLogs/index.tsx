import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useHome } from '../../context/HomeContext'
import { cn } from '../../lib/cn'
import IncidentsTab from './tabs/IncidentsTab'
import IposTab from './tabs/IposTab'
import AuditTab from './tabs/AuditTab'
import ExportsTab from './tabs/ExportsTab'

type OrgLogTab = 'incidents' | 'ipos' | 'audit' | 'exports'

const TABS: { id: OrgLogTab; label: string }[] = [
  { id: 'incidents', label: 'Incidents' },
  { id: 'ipos',      label: 'IPOS' },
  { id: 'audit',     label: 'Audit' },
  { id: 'exports',   label: 'Exports' },
]

export default function OrgLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { homes } = useHome()
  const [selectedHomeId, setSelectedHomeId] = useState<string>('all')

  const initialTab = (searchParams.get('tab') as OrgLogTab | null) ?? 'incidents'
  const [tab, setTab] = useState<OrgLogTab>(
    TABS.some(t => t.id === initialTab) ? initialTab : 'incidents'
  )

  // Sync tab with URL param
  useEffect(() => {
    const p = searchParams.get('tab') as OrgLogTab | null
    if (p && TABS.some(t => t.id === p)) setTab(p)
  }, [searchParams])

  // Update URL when tab changes
  function handleTabChange(newTab: OrgLogTab) {
    setTab(newTab)
    setSearchParams({ tab: newTab })
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black pb-8'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='px-4 pt-5 pb-3'>
          <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Organization Logs</h1>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-0.5'>
            Cross-home oversight and compliance
          </p>
        </div>

        {/* Home filter dropdown */}
        <div className='px-4 pb-3'>
          <div className='flex items-center gap-2'>
            <Building2 size={16} className='text-zinc-400' />
            <select
              value={selectedHomeId}
              onChange={e => setSelectedHomeId(e.target.value)}
              className='flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
            >
              <option value='all'>All Homes</option>
              {homes.map(home => (
                <option key={home.id} value={home.id}>{home.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab bar */}
        <div className='flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4'>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px]',
                tab === t.id
                  ? 'border-indigo-500 text-zinc-900 dark:text-white'
                  : 'border-transparent text-zinc-500'
              )}
            >
              {t.id === 'incidents' && (
                <span className='w-1.5 h-1.5 rounded-full bg-red-500 shrink-0' />
              )}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className='flex-1'>
          {tab === 'incidents' && <IncidentsTab selectedHomeId={selectedHomeId} homes={homes} />}
          {tab === 'ipos'      && <IposTab selectedHomeId={selectedHomeId} homes={homes} />}
          {tab === 'audit'     && <AuditTab selectedHomeId={selectedHomeId} homes={homes} />}
          {tab === 'exports'   && <ExportsTab selectedHomeId={selectedHomeId} homes={homes} />}
        </div>
      </div>
    </div>
  )
}
