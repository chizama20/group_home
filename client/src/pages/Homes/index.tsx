import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, Plus, Home, Users, MapPin, ChevronRight } from 'lucide-react'
import { getHomes, type Home as HomeType } from '../../api/homes'
import { getOrgDashboard } from '../../api/orgs'

interface HomeWithCounts extends HomeType {
  resident_count: number
  staff_count: number
}

function SkeletonCard() {
  return (
    <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4'>
      <div className='flex items-start gap-3'>
        <div className='w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse' />
        <div className='flex-1 space-y-2'>
          <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-2/3' />
          <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-1/2' />
        </div>
      </div>
      <div className='flex gap-4 mt-4'>
        <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-20' />
        <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-20' />
      </div>
    </div>
  )
}

function HomeCard({ home }: { home: HomeWithCounts }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/homes/${home.id}`)}
      className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 cursor-pointer hover:border-primary/30 dark:hover:border-primary/40 transition-colors'
    >
      <div className='flex items-start gap-3'>
        <div className='w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0'>
          <Home className='h-5 w-5' />
        </div>
        <div className='flex-1 min-w-0'>
          <h3 className='text-sm font-semibold text-zinc-900 dark:text-white truncate'>
            {home.name}
          </h3>
          {home.address && (
            <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1 truncate'>
              <MapPin className='h-3 w-3 shrink-0' />
              {home.address}
            </p>
          )}
        </div>
        <ChevronRight className='h-4 w-4 text-zinc-400 dark:text-zinc-600 shrink-0 mt-1' />
      </div>

      <div className='flex gap-4 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800'>
        <div className='flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
          <Users className='h-3.5 w-3.5' />
          <span>{home.resident_count} resident{home.resident_count !== 1 ? 's' : ''}</span>
        </div>
        <div className='flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
          <Users className='h-3.5 w-3.5' />
          <span>{home.staff_count} staff</span>
        </div>
      </div>
    </div>
  )
}

export default function HomesPage() {
  const [homes, setHomes] = useState<HomeWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchHomes() {
      try {
        const [homesRes, dashRes] = await Promise.all([
          getHomes(),
          getOrgDashboard(),
        ])

        if (homesRes.data.success && homesRes.data.data) {
          const homesList = homesRes.data.data

          // Build a count lookup from the org dashboard (avoids N×2 per-home requests)
          const homeCounts: Record<string, { resident_count: number; staff_count: number }> = {}
          if (dashRes.data.success && dashRes.data.data?.homes) {
            for (const h of dashRes.data.data.homes) {
              homeCounts[h.id] = { resident_count: h.resident_count, staff_count: h.staff_count }
            }
          }

          const homesWithCounts = homesList.map(home => ({
            ...home,
            resident_count: homeCounts[home.id]?.resident_count ?? 0,
            staff_count:    homeCounts[home.id]?.staff_count    ?? 0,
          }))

          setHomes(homesWithCounts)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load homes')
      } finally {
        setLoading(false)
      }
    }
    fetchHomes()
  }, [])

  const searchLower = search.toLowerCase()
  const filtered = homes.filter(h =>
    h.name.toLowerCase().includes(searchLower) ||
    (h.address ?? '').toLowerCase().includes(searchLower)
  )

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-8'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='px-4 pt-5 pb-3 flex items-center justify-between'>
          <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Homes</h1>
          <Link
            to='/homes/new'
            className='flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-3 py-2 rounded-md min-h-[40px]'
          >
            <Plus className='h-4 w-4' />
            New Home
          </Link>
        </div>

        {/* Search */}
        <div className='mx-4 mb-4'>
          <div className='relative'>
            <Search className='h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none' />
            <input
              type='search'
              placeholder='Search by name or address...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]'
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className='mx-4 grid gap-3 sm:grid-cols-2'>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4'>
            <p className='text-sm text-red-500'>{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {filtered.length > 0 ? (
              <div className='mx-4 grid gap-3 sm:grid-cols-2'>
                {filtered.map(home => (
                  <HomeCard key={home.id} home={home} />
                ))}
              </div>
            ) : (
              <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center'>
                <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                  {homes.length === 0 ? 'No homes added yet.' : 'No homes found.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
