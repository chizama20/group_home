import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeSwitcherStrip from '../../components/HomeSwitcherStrip'
import StatusBadge from '../../components/StatusBadge'
import { Skeleton } from '../../components/ui/skeleton'
import { useHome } from '../../context/HomeContext'
import { useResidents } from '../../hooks/useResidents'
import { useRole } from '../../utils/role'
import { getHomeIpos } from '../../api/logs'
import { currentShift } from '../../types/log'
import { todayStr } from '../../utils/date'
import type { Resident } from '../../types/resident'
import ResidentForm from './ResidentForm'

function ResidentRow({ r, badge }: { r: Resident; badge: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/residents/${r.id}`)}
      className='w-full flex items-center gap-3 px-4 py-3 text-left min-h-[60px] hover:bg-muted border-b border-border last:border-0'
    >
      <div className='w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0'>
        {r.first_name[0]}{r.last_name[0]}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium text-foreground'>{r.first_name} {r.last_name}</p>
        {r.room && <p className='text-xs text-muted-foreground mt-0.5'>Room {r.room}</p>}
      </div>
      <StatusBadge status={badge} />
    </button>
  )
}

function SectionHeader({ label, count, colour }: { label: string; count: number; colour: string }) {
  return (
    <div className={`px-4 py-2 border-b ${colour}`}>
      <span className='text-xs font-semibold uppercase tracking-wide'>{label}</span>
      <span className='text-xs ml-2 opacity-70'>{count}</span>
    </div>
  )
}

export default function ResidentsPage() {
  const { homeId }                         = useHome()
  const { residents, loading, error, refresh } = useResidents(homeId)
  const { isManagerOrAbove }               = useRole()
  const [search, setSearch]                = useState('')
  const [filedIds, setFiledIds]            = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd]              = useState(false)

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

  const searchLower = search.toLowerCase()
  const active = residents.filter(r => r.is_active)
  const filtered = active.filter(r =>
    r.first_name.toLowerCase().includes(searchLower) ||
    r.last_name.toLowerCase().includes(searchLower) ||
    (r.room ?? '').toLowerCase().includes(searchLower)
  )

  const urgent    = filtered.filter(r => r.status === 'urgent')
  const attention = filtered.filter(r => r.status !== 'urgent' && !filedIds.has(r.id))
  const allGood   = filtered.filter(r => r.status !== 'urgent' && filedIds.has(r.id))

  return (
    <div className='pb-20 min-h-screen bg-background'>
      {/* Header */}
      <div className='bg-card border-b border-border'>
        <div className='px-4 pt-5 pb-3'>
          <div className='flex items-center justify-between mb-3'>
            <h1 className='text-xl font-bold text-foreground'>Residents</h1>
            {isManagerOrAbove && homeId && (
              <button
                onClick={() => setShowAdd(true)}
                className='text-sm font-medium text-primary border border-primary/30 rounded-xl px-3 py-2 min-h-[40px] hover:bg-primary/10 transition-colors'
              >
                + Add
              </button>
            )}
          </div>
          <input
            type='search'
            placeholder='Search by name or room…'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='w-full border border-border rounded-lg px-3 py-2 text-sm min-h-[44px]'
          />
        </div>
        <HomeSwitcherStrip />
      </div>

      {/* List */}
      <div className='bg-card mt-3'>
        {loading && (
          <div className='p-4 space-y-3'>
            {[...Array(5)].map((_, i) => (
              <div key={i} className='flex items-center gap-3'>
                <Skeleton className='w-10 h-10 rounded-full' />
                <div className='flex-1 space-y-1.5'>
                  <Skeleton className='h-4 w-40' />
                  <Skeleton className='h-3 w-24' />
                </div>
              </div>
            ))}
          </div>
        )}
        {error   && <p className='p-4 text-sm text-red-600'>{error}</p>}
        {!loading && !homeId && <p className='p-4 text-sm text-muted-foreground'>No home selected</p>}

        {!loading && homeId && (
          <>
            {urgent.length > 0 && (
              <>
                <SectionHeader label='Urgent' count={urgent.length} colour='bg-red-50 border-red-100 text-red-600' />
                {urgent.map(r => <ResidentRow key={r.id} r={r} badge='urgent' />)}
              </>
            )}
            {attention.length > 0 && (
              <>
                <SectionHeader label='Needs Attention' count={attention.length} colour='bg-amber-50 border-amber-100 text-amber-600' />
                {attention.map(r => <ResidentRow key={r.id} r={r} badge='attention' />)}
              </>
            )}
            {allGood.length > 0 && (
              <>
                <SectionHeader label='All Good' count={allGood.length} colour='bg-green-50 border-green-100 text-green-600' />
                {allGood.map(r => <ResidentRow key={r.id} r={r} badge='all_good' />)}
              </>
            )}
            {filtered.length === 0 && !error && (
              <p className='p-4 text-sm text-muted-foreground'>
                {search ? 'No residents match your search' : 'No active residents'}
              </p>
            )}
          </>
        )}
      </div>

      {showAdd && homeId && (
        <ResidentForm
          homeId={homeId}
          onSuccess={() => { setShowAdd(false); refresh() }}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
