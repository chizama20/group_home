import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getHomeIncidents, createIncident } from '../../api/incidents'
import type { Incident } from '../../types/incident'
import type { Resident } from '../../types/resident'
import StatusBadge from '../../components/StatusBadge'
import { formatDate } from '../../utils/date'
import { cn } from '../../lib/cn'
import { useRole } from '../../utils/role'
import IncidentReviewSheet from './IncidentReviewSheet'
import { Skeleton } from '../../components/ui/skeleton'

const INCIDENT_TYPES = [
  'Physical altercation',
  'Medication refusal',
  'Self-harm',
  'Property damage',
  'Elopement',
  'Other',
]

const SEVERITIES: { value: 'low' | 'medium' | 'high'; label: string; classes: string }[] = [
  { value: 'low',    label: 'Low',    classes: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'medium', label: 'Medium', classes: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'high',   label: 'High',   classes: 'bg-red-100 text-red-700 border-red-300' },
]

interface Props {
  homeId:    string
  residents: Resident[]
}

// ── Manager oversight view ────────────────────────────────────────────────────

const MANAGER_FILTERS = ['all', 'open', 'signed_off', 'escalated', 'closed'] as const
type ManagerFilter = typeof MANAGER_FILTERS[number]

const FILTER_LABELS: Record<ManagerFilter, string> = {
  all:       'All',
  open:      'Open',
  signed_off: 'Signed off',
  escalated: 'Escalated',
  closed:    'Closed',
}

function ManagerIncidentView({ homeId }: { homeId: string }) {
  const [incidents, setIncidents]     = useState<Incident[]>([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState<ManagerFilter>('open')
  const [reviewing, setReviewing]     = useState<Incident | null>(null)

  function load() {
    setLoading(true)
    getHomeIncidents(homeId)
      .then(res => setIncidents(res.data.data ?? []))
      .catch(() => toast.error('Failed to load incidents'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [homeId])

  const filtered = filter === 'all'
    ? incidents
    : incidents.filter(i => i.status === filter)

  return (
    <div className='p-4 space-y-3'>
      {/* Filter pills */}
      <div className='flex gap-2 overflow-x-auto pb-1' style={{ scrollbarWidth: 'none' }}>
        {MANAGER_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] border shrink-0',
              filter === f
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border'
            )}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {loading && (
        <div className='space-y-3'>
          {[1, 2, 3].map(i => (
            <div key={i} className='bg-card rounded-xl shadow-sm px-4 py-3 space-y-2'>
              <div className='flex items-start justify-between gap-2'>
                <Skeleton className='h-4 flex-1' />
                <Skeleton className='w-16 h-5 rounded-full' />
              </div>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='h-8 w-full' />
            </div>
          ))}
        </div>
      )}
      {!loading && !filtered.length && (
        <p className='text-sm text-muted-foreground py-2'>No incidents{filter !== 'all' ? ` with status "${FILTER_LABELS[filter].toLowerCase()}"` : ''}</p>
      )}

      {filtered.map(incident => (
        <div key={incident.id} className='bg-card rounded-xl shadow-sm px-4 py-3'>
          <div className='flex items-start justify-between gap-2 mb-1'>
            <p className='text-sm font-semibold text-foreground flex-1 min-w-0'>
              {incident.incident_type ?? incident.title}
            </p>
            <StatusBadge status={incident.status} />
          </div>
          {incident.severity && (
            <span className={cn(
              'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1',
              incident.severity === 'high'   ? 'bg-red-100 text-red-700' :
              incident.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                               'bg-green-100 text-green-700'
            )}>
              {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)} severity
            </span>
          )}
          <p className='text-xs text-muted-foreground mb-2'>{formatDate(incident.created_at)}</p>
          <p className='text-sm text-foreground line-clamp-2 mb-3'>{incident.description}</p>
          {(incident.status === 'open' || incident.status === 'reviewed') && (
            <button
              onClick={() => setReviewing(incident)}
              className='text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 min-h-[36px] hover:bg-primary/10 transition-colors'
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

function EmployeeIncidentView({ homeId, residents }: Props) {
  const [incidents, setIncidents]   = useState<Incident[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [filter, setFilter]         = useState<string>('all')

  const [residentId, setResidentId] = useState('')
  const [type, setType]             = useState('')
  const [severity, setSeverity]     = useState<'low' | 'medium' | 'high' | null>(null)
  const [description, setDescription] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [submitted, setSubmitted]   = useState(false)

  const active = residents.filter(r => r.is_active)

  function loadFeed() {
    setFeedLoading(true)
    getHomeIncidents(homeId)
      .then(res => setIncidents(res.data.data ?? []))
      .catch(() => toast.error('Failed to load incidents'))
      .finally(() => setFeedLoading(false))
  }

  useEffect(() => { loadFeed() }, [homeId])

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
      <div className='bg-card border-b border-border p-4 space-y-4'>
        <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>New Incident Report</p>

        {submitted && (
          <div className='bg-primary/10 border border-primary/30 rounded-xl px-4 py-3'>
            <p className='text-sm font-medium text-primary'>Incident filed.</p>
            <p className='text-xs text-primary mt-0.5'>A manager will review and sign off.</p>
          </div>
        )}

        <div>
          <label className='block text-sm font-medium text-foreground mb-1'>
            Resident <span className='text-red-500'>*</span>
          </label>
          <select
            value={residentId}
            onChange={e => { setResidentId(e.target.value); setSubmitted(false) }}
            className='w-full border border-border rounded-xl px-3 py-2 text-sm min-h-[44px] bg-card'
          >
            <option value=''>Select resident…</option>
            {active.map(r => (
              <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium text-foreground mb-1'>
            Type <span className='text-red-500'>*</span>
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className='w-full border border-border rounded-xl px-3 py-2 text-sm min-h-[44px] bg-card'
          >
            <option value=''>Select type…</option>
            {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium text-foreground mb-2'>
            Severity <span className='text-red-500'>*</span>
          </label>
          <div className='flex gap-2'>
            {SEVERITIES.map(s => (
              <button
                key={s.value}
                onClick={() => setSeverity(s.value)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold border min-h-[44px]',
                  severity === s.value
                    ? s.classes + ' ring-2 ring-offset-1 ring-primary/40'
                    : 'bg-muted text-muted-foreground border-border'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className='block text-sm font-medium text-foreground mb-1'>
            What happened <span className='text-red-500'>*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder='Describe what happened…'
            rows={4}
            className='w-full border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-foreground mb-1'>
            Time occurred <span className='text-red-500'>*</span>
          </label>
          <input
            type='datetime-local'
            value={occurredAt}
            onChange={e => setOccurredAt(e.target.value)}
            className='w-full border border-border rounded-xl px-3 py-2 text-sm min-h-[44px]'
          />
        </div>

        {error && (
          <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{error}</p>
        )}

        <button
          onClick={() => { void handleSubmit() }}
          disabled={!residentId || !type || !severity || !description.trim() || !occurredAt || submitting}
          className='w-full bg-red-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'
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
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] border',
                filter === f
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {feedLoading && (
          <div className='space-y-3'>
            {[1, 2].map(i => (
              <div key={i} className='bg-card rounded-xl shadow-sm px-4 py-3 space-y-2'>
                <div className='flex items-start justify-between gap-2'>
                  <Skeleton className='h-4 flex-1' />
                  <Skeleton className='w-16 h-5 rounded-full' />
                </div>
                <Skeleton className='h-3 w-24' />
                <Skeleton className='h-8 w-full' />
              </div>
            ))}
          </div>
        )}
        {!feedLoading && !filtered.length && (
          <p className='text-sm text-muted-foreground'>No incidents {filter !== 'all' ? `with status "${filter}"` : ''}</p>
        )}

        <div className='space-y-3'>
          {filtered.map(incident => (
            <div key={incident.id} className='bg-card rounded-xl shadow-sm px-4 py-3'>
              <div className='flex items-start justify-between gap-2 mb-1'>
                <p className='text-sm font-semibold text-foreground'>{incident.incident_type ?? incident.title}</p>
                <StatusBadge status={incident.status} />
              </div>
              {incident.severity && (
                <span className={cn(
                  'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1',
                  incident.severity === 'high'   ? 'bg-red-100 text-red-700' :
                  incident.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                   'bg-green-100 text-green-700'
                )}>
                  {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)} severity
                </span>
              )}
              <p className='text-xs text-muted-foreground mb-1'>{formatDate(incident.created_at)}</p>
              <p className='text-sm text-foreground line-clamp-2'>{incident.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function IncidentTab({ homeId, residents }: Props) {
  const { isManagerOrAbove } = useRole()

  if (isManagerOrAbove) {
    return <ManagerIncidentView homeId={homeId} />
  }

  return <EmployeeIncidentView homeId={homeId} residents={residents} />
}
