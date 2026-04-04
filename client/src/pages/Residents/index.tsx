import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronRight } from 'lucide-react'
import HomeSwitcherStrip from '../../components/HomeSwitcherStrip'
import { useHome } from '../../context/HomeContext'
import { useResidents } from '../../hooks/useResidents'
import { useRole } from '../../utils/role'
import { getHomeIpos } from '../../api/logs'
import { currentShift } from '../../types/log'
import { todayStr } from '../../utils/date'
import type { Resident } from '../../types/resident'
import ResidentForm from './ResidentForm'

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusGroup = 'urgent' | 'attention' | 'allGood'
type FilterChip  = 'All' | 'Urgent' | 'Attention' | 'All Good'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(r: Resident) {
  return `${r.first_name[0] ?? ''}${r.last_name[0] ?? ''}`
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className='mx-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3'>
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
  hasMedAlert,
  hasIposAlert,
}: {
  r: Resident
  group: StatusGroup
  isFirst: boolean
  hasMedAlert: boolean
  hasIposAlert: boolean
}) {
  const navigate = useNavigate()

  const avatarClass =
    group === 'urgent'
      ? 'w-11 h-11 rounded-full bg-red-500/15 text-red-400 text-sm font-bold flex items-center justify-center shrink-0 ring-2 ring-red-400/30 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900'
      : group === 'attention'
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
        <p className='text-[15px] font-semibold text-zinc-900 dark:text-white'>
          {r.first_name} {r.last_name}
        </p>
        {r.room && (
          <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>Room {r.room}</p>
        )}
      </div>

      {/* Alert pills + chevron */}
      <div className='flex items-center gap-1'>
        {hasMedAlert && (
          <span className='bg-red-500/10 text-red-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-md'>
            Meds due
          </span>
        )}
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
  filedIds,
}: {
  group: StatusGroup
  residents: Resident[]
  filedIds: Set<string>
}) {
  if (residents.length === 0) return null

  const dotClass =
    group === 'urgent'
      ? 'w-2 h-2 rounded-full bg-red-500'
      : group === 'attention'
      ? 'w-2 h-2 rounded-full bg-amber-500'
      : 'w-2 h-2 rounded-full bg-green-500'

  const labelClass =
    group === 'urgent'
      ? 'text-xs font-semibold uppercase tracking-wide text-red-500'
      : group === 'attention'
      ? 'text-xs font-semibold uppercase tracking-wide text-amber-500'
      : 'text-xs font-semibold uppercase tracking-wide text-green-500'

  const label =
    group === 'urgent' ? 'Urgent' : group === 'attention' ? 'Attention' : 'All Good'

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
      <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden mb-3'>
        {residents.map((r, idx) => (
          <ResidentRow
            key={r.id}
            r={r}
            group={group}
            isFirst={idx === 0}
            hasMedAlert={group === 'urgent'}
            hasIposAlert={group === 'attention' || (!filedIds.has(r.id) && group === 'urgent')}
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
  const { isOrgAdmin }                          = useRole()
  const [search, setSearch]                     = useState('')
  const [filedIds, setFiledIds]                 = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd]                   = useState(false)
  const [activeFilter, setActiveFilter]         = useState<FilterChip>('All')

  // Fetch today's IPOS to compute "attention" group
  useEffect(() => {
    if (!homeId) return
    getHomeIpos(homeId, { date: todayStr(), shift: currentShift() })
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

  const urgentAll    = filtered.filter(r => r.status === 'urgent')
  const attentionAll = filtered.filter(r => r.status !== 'urgent' && !filedIds.has(r.id))
  const allGoodAll   = filtered.filter(r => r.status !== 'urgent' && filedIds.has(r.id))

  // Apply active filter chip
  const urgent    = activeFilter === 'All' || activeFilter === 'Urgent'    ? urgentAll    : []
  const attention = activeFilter === 'All' || activeFilter === 'Attention' ? attentionAll : []
  const allGood   = activeFilter === 'All' || activeFilter === 'All Good'  ? allGoodAll   : []

  // Chip data
  const chips: { label: FilterChip; count: number }[] = [
    { label: 'All',       count: filtered.length },
    { label: 'Urgent',    count: urgentAll.length },
    { label: 'Attention', count: attentionAll.length },
    { label: 'All Good',  count: allGoodAll.length },
  ]

  function chipClass(chip: { label: FilterChip; count: number }) {
    const isActive = activeFilter === chip.label
    if (isActive) {
      return 'px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 min-h-[32px] whitespace-nowrap bg-indigo-600 text-white border-indigo-600'
    }
    if (chip.label === 'Urgent' && chip.count > 0) {
      return 'px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 min-h-[32px] whitespace-nowrap bg-red-500/10 text-red-500 border-red-200 dark:border-red-900/40'
    }
    if (chip.label === 'Attention' && chip.count > 0) {
      return 'px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 min-h-[32px] whitespace-nowrap bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
    }
    return 'px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 min-h-[32px] whitespace-nowrap bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
  }

  const hasResults = urgent.length + attention.length + allGood.length > 0

  return (
    <div className='pb-8 min-h-screen bg-zinc-50 dark:bg-black'>
      <div className='max-w-4xl mx-auto'>

      {/* Home switcher */}
      <HomeSwitcherStrip />

      {/* Header */}
      <div className='px-4 pt-5 pb-3 flex items-center justify-between'>
        <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Residents</h1>
        {isOrgAdmin && homeId && (
          <button
            onClick={() => setShowAdd(true)}
            className='w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center'
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
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]'
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
        <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4'>
          <p className='text-sm text-red-500'>{error}</p>
        </div>
      )}

      {/* No home selected */}
      {!loading && !homeId && !error && (
        <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center'>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No home selected.</p>
        </div>
      )}

      {/* Content */}
      {!loading && homeId && (
        <>
          {hasResults ? (
            <>
              <Section group='urgent'    residents={urgent}    filedIds={filedIds} />
              <Section group='attention' residents={attention} filedIds={filedIds} />
              <Section group='allGood'   residents={allGood}   filedIds={filedIds} />
            </>
          ) : (
            <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center'>
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
