import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Building2,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { getOrgDashboard } from '../../api/orgs'
import type { OrgDashboardData, OrgDashboardHome, NeedsAttentionItem } from '../../api/orgs'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSeverityColor(severity: NeedsAttentionItem['severity']): {
  dot: string
  badge: string
  badgeText: string
} {
  switch (severity) {
    case 'error':
      return { dot: 'bg-red-500', badge: 'bg-red-500/10', badgeText: 'text-red-400' }
    case 'warning':
      return { dot: 'bg-amber-500', badge: 'bg-amber-500/10', badgeText: 'text-amber-400' }
    default:
      return { dot: 'bg-blue-500', badge: 'bg-blue-500/10', badgeText: 'text-blue-400' }
  }
}

// ── Sub-sections ─────────────────────────────────────────────────────────────

function StatBar({
  totalHomes,
  totalResidents,
  totalStaff,
  openIncidents,
}: {
  totalHomes: number
  totalResidents: number
  totalStaff: number
  openIncidents: number
}) {
  return (
    <div className='px-4 mt-4'>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-2.5'>
        {/* Total Homes */}
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5'>
          <div className='flex items-center justify-between'>
            <div className='w-8 h-8 rounded-md flex items-center justify-center bg-primary/10 text-primary'>
              <Building2 className='w-4 h-4' />
            </div>
          </div>
          <p className='text-2xl font-bold tracking-tight leading-none mt-2 text-zinc-900 dark:text-white'>
            {totalHomes}
          </p>
          <p className='text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1'>Total Homes</p>
        </div>

        {/* Total Residents */}
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5'>
          <div className='flex items-center justify-between'>
            <div className='w-8 h-8 rounded-md flex items-center justify-center bg-emerald-500/15 text-emerald-400'>
              <Users className='w-4 h-4' />
            </div>
          </div>
          <p className='text-2xl font-bold tracking-tight leading-none mt-2 text-zinc-900 dark:text-white'>
            {totalResidents}
          </p>
          <p className='text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1'>Total Residents</p>
        </div>

        {/* Total Staff */}
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5'>
          <div className='flex items-center justify-between'>
            <div className='w-8 h-8 rounded-md flex items-center justify-center bg-violet-500/15 text-violet-400'>
              <Users className='w-4 h-4' />
            </div>
          </div>
          <p className='text-2xl font-bold tracking-tight leading-none mt-2 text-zinc-900 dark:text-white'>
            {totalStaff}
          </p>
          <p className='text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1'>Total Staff</p>
        </div>

        {/* Open Incidents */}
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5'>
          <div className='flex items-center justify-between'>
            <div className='w-8 h-8 rounded-md flex items-center justify-center bg-red-500/15 text-red-400'>
              <AlertTriangle className='w-4 h-4' />
            </div>
          </div>
          <p className='text-2xl font-bold tracking-tight leading-none mt-2 text-red-500'>
            {openIncidents}
          </p>
          <p className='text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1'>Open Incidents</p>
        </div>
      </div>
    </div>
  )
}

function NeedsAttentionSection({ items }: { items: NeedsAttentionItem[] }) {
  if (!items.length) return null

  return (
    <div className='mt-5'>
      <p className='text-base font-semibold text-zinc-900 dark:text-white px-4 mb-3'>
        Needs Attention
      </p>

      {items.map((item, index) => {
        const colors = getSeverityColor(item.severity)
        return (
          <div
            key={`${item.type}-${index}`}
            className='mx-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center gap-3 p-3.5'
          >
            <div className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
            <div className='flex-1'>
              <p className='text-sm font-medium text-zinc-900 dark:text-white'>{item.label}</p>
              <p className='text-xs text-zinc-500 dark:text-zinc-400'>Requires action</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge} ${colors.badgeText}`}>
              {item.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function HomeCardsSection({ homes }: { homes: OrgDashboardHome[] }) {
  const navigate = useNavigate()

  if (!homes.length) {
    return (
      <div className='mt-5'>
        <p className='text-base font-semibold text-zinc-900 dark:text-white px-4 mb-3'>
          Homes
        </p>
        <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-sm text-zinc-400 dark:text-zinc-500'>
          No homes found.
        </div>
      </div>
    )
  }

  return (
    <div className='mt-5'>
      <p className='text-base font-semibold text-zinc-900 dark:text-white px-4 mb-3'>
        Homes
      </p>

      {homes.map(home => (
        <div
          key={home.id}
          onClick={() => navigate(`/homes/${home.id}`)}
          className='mx-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors'
        >
          <div className='w-10 h-10 rounded-md flex items-center justify-center bg-primary/10 text-primary shrink-0'>
            <Building2 className='w-5 h-5' />
          </div>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <p className='text-sm font-medium text-zinc-900 dark:text-white truncate'>
                {home.name}
              </p>
              {!home.is_active && (
                <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'>
                  Inactive
                </span>
              )}
            </div>
            <p className='text-xs text-zinc-500 dark:text-zinc-400 truncate'>
              {home.address}
            </p>
            <div className='flex items-center gap-3 mt-1'>
              <span className='text-xs text-zinc-400 dark:text-zinc-500'>
                {home.resident_count} resident{home.resident_count !== 1 ? 's' : ''}
              </span>
              <span className='text-xs text-zinc-400 dark:text-zinc-500'>
                {home.staff_count} staff
              </span>
            </div>
          </div>
          <ChevronRight className='text-zinc-400 dark:text-zinc-600 h-5 w-5 shrink-0' />
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrgDashboardPage() {
  const [data, setData] = useState<OrgDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await getOrgDashboard()
        setData(response.data.data ?? null)
      } catch (err) {
        setError('Failed to load organization dashboard')
        console.error('Error fetching org dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }
    void fetchData()
  }, [])

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className='bg-zinc-50 dark:bg-zinc-950 min-h-screen pb-8'>
      <div className='max-w-4xl mx-auto'>
        {/* Page Header */}
        <div className='px-4 pt-5 pb-3'>
          <p className='text-[13px] text-zinc-500 dark:text-zinc-400 mb-0.5'>{dateStr}</p>
          <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>
            Organization Overview
          </h1>
        </div>

        {/* Error State */}
        {error && (
          <div className='mx-4 bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3'>
            <p className='text-sm text-red-400'>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className='flex justify-center mt-10'>
            <div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' />
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && data && (
          <>
            {/* Stat Bar */}
            <StatBar
              totalHomes={data.stats.totalHomes}
              totalResidents={data.stats.totalResidents}
              totalStaff={data.stats.totalStaff}
              openIncidents={data.stats.openIncidents}
            />

            {/* Needs Attention */}
            <NeedsAttentionSection items={data.needsAttention} />

            {/* Home Cards */}
            <HomeCardsSection homes={data.homes} />
          </>
        )}
      </div>
    </div>
  )
}
