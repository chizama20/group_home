import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronRight } from 'lucide-react'
import HomeSwitcherStrip from '../../components/HomeSwitcherStrip'
import { useHome } from '../../context/HomeContext'
import { useResidents } from '../../hooks/useResidents'
import { useRole } from '../../utils/role'
import { getHomeIposLogs } from '../../api/logs'
import { todayStr } from '../../utils/date'
import type { Resident } from '../../types/resident'
import ResidentForm from './ResidentForm'

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusGroup = 'attention' | 'allGood'
type FilterChip  = 'All' | 'Attention' | 'All Good'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(r: Resident) {
  return `${r.first_name[0] ?? ''}${r.last_name[0] ?? ''}`
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className='mx-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex items-center gap-3'>
      <div className='w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse shrink-0' />
      <div className='flex-1 space-y-2'>
        <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse' />
        <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-2/3' />
      </div>
    </div>
  )
}

// ─── Resident Row ─────────────────────────────────────────────────────────────

function ResidentRow({
  r,
  group,
  isFirst,
  hasIposAlert,
}: {
  r: Resident
  group: StatusGroup
  isFirst: boolean
  hasIposAlert: boolean
}) {
  const navigate = useNavigate()

  const avatarClass =
    group === 'attention'
      ? 'w-11 h-11 rounded-full bg-amber-500/10 text-amber-500 text-sm font-bold flex items-center justify-center shrink-0'
      : 'w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm font-bold flex items-center justify-center shrink-0'

  return (
    <div
      onClick={() => navigate(`/residents/${r.id}`)}
      className={`flex items-center gap-3 px-4 py-3.5 min-h-[56px] cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/50${
        isFirst ? '' : ' border-t border-zinc-100 dark:border-zinc-800'
      }`}
    >
      {/* Avatar */}
      <div className={avatarClass}>{getInitials(r)}</div>

      {/* Info */}
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
          {r.first_name} {r.last_name}
        </p>
        {r.room && (
          <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>Room {r.room}</p>
        )}
      </div>

      {/* Alert pills + chevron */}
      <div className='flex items-center gap-1'>
        {hasIposAlert && (
          <span className='bg-amber-500/10 text-amber-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-md'>
            IPOS
          </span>
        )}
        <ChevronRight className='h-4 w-4 text-zinc-300 dark:text-zinc-700 ml-1' />
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  group,
  residents,
}: {
  group: StatusGroup
  residents: Resident[]
}) {
  if (residents.length === 0) return null

  const dotClass =
    group === 'attention'
      ? 'w-2 h-2 rounded-full bg-amber-500'
      : 'w-2 h-2 rounded-full bg-green-500'

  const labelClass =
    group === 'attention'
      ? 'text-xs font-semibold uppercase tracking-wide text-amber-500'
      : 'text-xs font-semibold uppercase tracking-wide text-green-500'

  const label = group === 'attention' ? 'Attention' : 'All Good'

  return (
    <>
      {/* Section header */}
      <div className='flex items-center gap-2 px-4 mb-2 mt-4'>
        <div className={dotClass} />
        <span className={labelClass}>{label}</span>
        <span className='text-xs text-zinc-400 dark:text-zinc-600 ml-auto'>
          {residents.length}
        </span>
      </div>

      {/* Section card */}
      <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden mb-3'>
        {residents.map((r, idx) => (
          <ResidentRow
            key={r.id}
            r={r}
            group={group}
            isFirst={idx === 0}
            hasIposAlert={group === 'attention'}
          />
        ))}
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResidentsPage() {
  const { homeId }                              = useHome()
  const { residents, loading, error, refresh }  = useResidents(homeId)
  const { isAdmin }                              = useRole()
  const [search, setSearch]                     = useState('')
  const [filedIds, setFiledIds]                 = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd]                   = useState(false)
  const [activeFilter, setActiveFilter]         = useState<FilterChip>('All')

  // Fetch today's IPOS to compute "attention" group
  useEffect(() => {
    if (!homeId) return
    getHomeIposLogs(homeId, { date: todayStr() })
      .then(res => {
        if (res.data.success && res.data.data)
          setFiledIds(new Set(res.data.data.map(l => l.resident_id)))
      })
      .catch(() => {/* non-critical */})
  }, [homeId])

  // Filtering
  const searchLower = search.toLowerCase()
  const active      = residents.filter(r => r.is_active)
  const filtered    = active.filter(r =>
    r.first_name.toLowerCase().includes(searchLower) ||
    r.last_name.toLowerCase().includes(searchLower) ||
    (r.room ?? '').toLowerCase().includes(searchLower)
  )

  const attentionAll = filtered.filter(r => !filedIds.has(r.id))
  const allGoodAll   = filtered.filter(r => filedIds.has(r.id))

  // Apply active filter chip
  const attention = activeFilter === 'All' || activeFilter === 'Attention' ? attentionAll : []
  const allGood   = activeFilter === 'All' || activeFilter === 'All Good'  ? allGoodAll   : []

  // Chip data
  const chips: { label: FilterChip; count: number }[] = [
    { label: 'All',       count: filtered.length },
    { label: 'Attention', count: attentionAll.length },
    { label: 'All Good',  count: allGoodAll.length },
  ]

  function chipClass(chip: { label: FilterChip; count: number }) {
    const isActive = activeFilter === chip.label
    if (isActive) {
      return 'px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 min-h-[32px] whitespace-nowrap bg-primary text-white border-primary'
    }
    if (chip.label === 'Attention' && chip.count > 0) {
      return 'px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 min-h-[32px] whitespace-nowrap bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
    }
    return 'px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 min-h-[32px] whitespace-nowrap bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
  }

  const hasResults = attention.length + allGood.length > 0

  return (
    <div className='pb-8 min-h-screen bg-zinc-50 dark:bg-black'>
      <div className='max-w-4xl mx-auto'>

      {/* Home switcher */}
      <HomeSwitcherStrip />

      {/* Header */}
      <div className='px-4 pt-5 pb-3 flex items-center justify-between'>
        <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Residents</h1>
        {isAdmin && homeId && (
          <button
            onClick={() => setShowAdd(true)}
            className='w-8 h-8 rounded-full bg-primary flex items-center justify-center'
            aria-label='Add resident'
          >
            <Plus className='h-4 w-4 text-white' />
          </button>
        )}
      </div>

      {/* Search */}
      <div className='mx-4 mb-3'>
        <div className='relative'>
          <Search className='h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none' />
          <input
            type='search'
            placeholder='Search by name or room…'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]'
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className='flex gap-2 px-4 mb-4 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
        {chips.map(chip => (
          <button
            key={chip.label}
            onClick={() => setActiveFilter(chip.label)}
            className={chipClass(chip)}
          >
            {chip.label} · {chip.count}
          </button>
        ))}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </>
      )}

      {/* Error */}
      {!loading && error && (
        <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4'>
          <p className='text-sm text-red-500'>{error}</p>
        </div>
      )}

      {/* No home selected */}
      {!loading && !homeId && !error && (
        <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center'>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No home selected.</p>
        </div>
      )}

      {/* Content */}
      {!loading && homeId && (
        <>
          {hasResults ? (
            <>
              <Section group='attention' residents={attention} />
              <Section group='allGood'   residents={allGood}   />
            </>
          ) : (
            <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center'>
              <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                {active.length === 0 ? 'No residents added yet.' : 'No residents found.'}
              </p>
            </div>
          )}
        </>
      )}

      {showAdd && homeId && (
        <ResidentForm
          homeId={homeId}
          onSuccess={() => { setShowAdd(false); refresh() }}
          onCancel={() => setShowAdd(false)}
        />
      )}
      </div>
    </div>
  )
}
