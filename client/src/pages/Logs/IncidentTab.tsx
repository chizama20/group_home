import { useState, useEffect } from 'react'
import { getHomeIncidents, createIncident } from '../../api/incidents'
import type { Incident } from '../../types/incident'
import type { Resident } from '../../types/resident'
import StatusBadge from '../../components/StatusBadge'
import { formatDate } from '../../utils/date'
import { cn } from '../../lib/cn'
import { useRole } from '../../utils/role'
import IncidentReviewSheet from './IncidentReviewSheet'

const INCIDENT_TYPES = [
  'Physical altercation',
  'Medication refusal',
  'Self-harm',
  'Property damage',
  'Elopement',
  'Other',
]

const SEVERITIES: { value: 'low' | 'medium' | 'high'; label: string; selectedClasses: string }[] = [
  { value: 'low',    label: 'Low',    selectedClasses: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { value: 'medium', label: 'Medium', selectedClasses: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'high',   label: 'High',   selectedClasses: 'bg-red-500/15 text-red-400 border-red-500/30' },
]

interface Props {
  homeId:       string
  residents:    Resident[]
  showFab:      boolean
  onFabHandled: () => void
}

// ── Manager oversight view ────────────────────────────────────────────────────

const MANAGER_FILTERS = ['all', 'open', 'signed_off', 'escalated', 'closed'] as const
type ManagerFilter = typeof MANAGER_FILTERS[number]

const FILTER_LABELS: Record<ManagerFilter, string> = {
  all:        'All',
  open:       'Open',
  signed_off: 'Signed off',
  escalated:  'Escalated',
  closed:     'Closed',
}

function ManagerIncidentView({ homeId }: { homeId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<ManagerFilter>('open')
  const [reviewing, setReviewing] = useState<Incident | null>(null)

  function load() {
    setLoading(true)
    getHomeIncidents(homeId)
      .then(res => setIncidents(res.data.data ?? []))
      .catch(() => {/* non-critical */})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [homeId])

  const filtered = filter === 'all'
    ? incidents
    : incidents.filter(i => i.status === filter)

  return (
    <div>
      {/* Filter pills */}
      <div className='flex gap-2 px-4 pt-4 pb-2 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
        {MANAGER_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] border shrink-0',
              filter === f
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
            )}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Skeleton */}
      {loading && (
        <div className='pt-1'>
          {[0,1,2].map(i => (
            <div key={i} className='mx-4 mb-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2 animate-pulse'>
              <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2' />
              <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/4' />
              <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4' />
            </div>
          ))}
        </div>
      )}

      {!loading && !filtered.length && (
        <p className='px-4 py-6 text-sm text-zinc-400 dark:text-zinc-600'>
          No incidents{filter !== 'all' ? ` with status "${FILTER_LABELS[filter].toLowerCase()}"` : ''}
        </p>
      )}

      {filtered.map(incident => (
        <div key={incident.id} className='mx-4 mb-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5'>
          <div className='flex items-start justify-between gap-2 mb-1'>
            <p className='text-sm font-semibold text-zinc-900 dark:text-white flex-1 min-w-0'>
              {incident.incident_type ?? incident.title}
            </p>
            <StatusBadge status={incident.status} />
          </div>
          {incident.severity && (
            <span className={cn(
              'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5',
              incident.severity === 'high'   ? 'bg-red-500/10 text-red-400' :
              incident.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                                               'bg-emerald-500/10 text-emerald-400'
            )}>
              {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)} severity
            </span>
          )}
          <p className='text-xs text-zinc-400 dark:text-zinc-500 mb-1.5'>{formatDate(incident.created_at)}</p>
          <p className='text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2'>{incident.description}</p>
          {(incident.status === 'open' || incident.status === 'reviewed') && (
            <button
              onClick={() => setReviewing(incident)}
              className='text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-lg px-3 py-1.5 min-h-[36px] mt-2'
            >
              Review
            </button>
          )}
        </div>
      ))}

      {reviewing && (
        <IncidentReviewSheet
          incident={reviewing}
          onClose={() => setReviewing(null)}
          onUpdate={load}
        />
      )}
    </div>
  )
}

// ── Employee form view ────────────────────────────────────────────────────────

function EmployeeIncidentView({ homeId, residents, showFab, onFabHandled }: Props) {
  const [incidents, setIncidents]     = useState<Incident[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [filter, setFilter]           = useState<string>('all')

  const [residentId, setResidentId]     = useState('')
  const [type, setType]                 = useState('')
  const [severity, setSeverity]         = useState<'low' | 'medium' | 'high' | null>(null)
  const [description, setDescription]   = useState('')
  const [occurredAt, setOccurredAt]     = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [submitted, setSubmitted]       = useState(false)

  const active = residents.filter(r => r.is_active)

  function loadFeed() {
    setFeedLoading(true)
    getHomeIncidents(homeId)
      .then(res => setIncidents(res.data.data ?? []))
      .catch(() => {/* non-critical */})
      .finally(() => setFeedLoading(false))
  }

  useEffect(() => { loadFeed() }, [homeId])

  // FAB: scroll to form
  useEffect(() => {
    if (!showFab) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
    onFabHandled()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFab])

  async function handleSubmit() {
    if (!residentId || !type || !severity || !description.trim() || !occurredAt) return
    setSubmitting(true)
    setError(null)
    try {
      await createIncident(homeId, { resident_id: residentId, incident_type: type, severity, description, occurred_at: occurredAt })
      setResidentId('')
      setType('')
      setSeverity(null)
      setDescription('')
      setOccurredAt('')
      setSubmitted(true)
      loadFeed()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter)

  return (
    <div>
      {/* Form */}
      <div className='bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 space-y-4'>
        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>New Incident Report</p>

        {submitted && (
          <div className='bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3'>
            <p className='text-sm font-medium text-indigo-400'>Incident filed.</p>
            <p className='text-xs text-indigo-400/70 mt-0.5'>A manager will review and sign off.</p>
          </div>
        )}

        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
            Resident <span className='text-red-500'>*</span>
          </label>
          <select
            value={residentId}
            onChange={e => { setResidentId(e.target.value); setSubmitted(false) }}
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px]'
          >
            <option value=''>Select resident…</option>
            {active.map(r => (
              <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
            Type <span className='text-red-500'>*</span>
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px]'
          >
            <option value=''>Select type…</option>
            {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2'>
            Severity <span className='text-red-500'>*</span>
          </label>
          <div className='flex gap-2'>
            {SEVERITIES.map(s => (
              <button
                key={s.value}
                onClick={() => setSeverity(s.value)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold border min-h-[44px] transition-all',
                  severity === s.value
                    ? s.selectedClasses + ' ring-2 ring-offset-1 ring-indigo-400'
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
            What happened <span className='text-red-500'>*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder='Describe what happened…'
            rows={4}
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-400'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
            Time occurred <span className='text-red-500'>*</span>
          </label>
          <input
            type='datetime-local'
            value={occurredAt}
            onChange={e => setOccurredAt(e.target.value)}
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px]'
          />
        </div>

        {error && (
          <div className='bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
            {error}
          </div>
        )}

        <button
          onClick={() => { void handleSubmit() }}
          disabled={!residentId || !type || !severity || !description.trim() || !occurredAt || submitting}
          className='w-full bg-red-600 text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
        >
          {submitting ? 'Filing…' : 'File incident report'}
        </button>
      </div>

      {/* Feed */}
      <div className='p-4'>
        <div className='flex items-center gap-2 mb-3 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
          {['all', 'open', 'reviewed', 'closed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] border shrink-0',
                filter === f
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {feedLoading && (
          <div className='space-y-3'>
            {[0,1,2].map(i => (
              <div key={i} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2 animate-pulse'>
                <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2' />
                <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/4' />
                <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4' />
              </div>
            ))}
          </div>
        )}

        {!feedLoading && !filtered.length && (
          <p className='px-4 py-6 text-sm text-zinc-400 dark:text-zinc-600'>
            No incidents {filter !== 'all' ? `with status "${filter}"` : ''}
          </p>
        )}

        <div className='space-y-3'>
          {filtered.map(incident => (
            <div key={incident.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5'>
              <div className='flex items-start justify-between gap-2 mb-1'>
                <p className='text-sm font-semibold text-zinc-900 dark:text-white flex-1 min-w-0'>
                  {incident.incident_type ?? incident.title}
                </p>
                <StatusBadge status={incident.status} />
              </div>
              {incident.severity && (
                <span className={cn(
                  'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5',
                  incident.severity === 'high'   ? 'bg-red-500/10 text-red-400' :
                  incident.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                                                   'bg-emerald-500/10 text-emerald-400'
                )}>
                  {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)} severity
                </span>
              )}
              <p className='text-xs text-zinc-400 dark:text-zinc-500 mb-1'>{formatDate(incident.created_at)}</p>
              <p className='text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2'>{incident.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function IncidentTab({ homeId, residents, showFab, onFabHandled }: Props) {
  const { isManagerOrAbove } = useRole()

  if (isManagerOrAbove) {
    return <ManagerIncidentView homeId={homeId} />
  }

  return <EmployeeIncidentView homeId={homeId} residents={residents} showFab={showFab} onFabHandled={onFabHandled} />
}
