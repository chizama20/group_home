import { useState, useEffect } from 'react'
import { getHomeIncidents, createIncident } from '../../api/incidents'
import type { Incident } from '../../types/incident'
import type { Resident } from '../../types/resident'
import StatusBadge from '../../components/StatusBadge'
import { formatDate } from '../../utils/date'
import { cn } from '../../lib/cn'

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

export default function IncidentTab({ homeId, residents }: Props) {
  const [incidents, setIncidents]   = useState<Incident[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [filter, setFilter]         = useState<string>('all')

  // Form state
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
      .catch(() => {/* non-critical */})
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
      <div className='bg-white border-b border-gray-100 p-4 space-y-4'>
        <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>New Incident Report</p>

        {submitted && (
          <div className='bg-blue-50 border border-blue-100 rounded-xl px-4 py-3'>
            <p className='text-sm font-medium text-blue-800'>Incident filed.</p>
            <p className='text-xs text-blue-600 mt-0.5'>A manager will review and sign off.</p>
          </div>
        )}

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Resident <span className='text-red-500'>*</span>
          </label>
          <select
            value={residentId}
            onChange={e => { setResidentId(e.target.value); setSubmitted(false) }}
            className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm min-h-[44px] bg-white'
          >
            <option value=''>Select resident…</option>
            {active.map(r => (
              <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Type <span className='text-red-500'>*</span>
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm min-h-[44px] bg-white'
          >
            <option value=''>Select type…</option>
            {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
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
                    ? s.classes + ' ring-2 ring-offset-1 ring-blue-400'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            What happened <span className='text-red-500'>*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder='Describe what happened…'
            rows={4}
            className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Time occurred <span className='text-red-500'>*</span>
          </label>
          <input
            type='datetime-local'
            value={occurredAt}
            onChange={e => setOccurredAt(e.target.value)}
            className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm min-h-[44px]'
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
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {feedLoading && <p className='text-sm text-gray-500'>Loading…</p>}
        {!feedLoading && !filtered.length && (
          <p className='text-sm text-gray-400'>No incidents {filter !== 'all' ? `with status "${filter}"` : ''}</p>
        )}

        <div className='space-y-3'>
          {filtered.map(incident => (
            <div key={incident.id} className='bg-white rounded-xl shadow-sm px-4 py-3'>
              <div className='flex items-start justify-between gap-2 mb-1'>
                <p className='text-sm font-semibold text-gray-900'>{incident.incident_type ?? incident.title}</p>
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
              <p className='text-xs text-gray-400 mb-1'>{formatDate(incident.created_at)}</p>
              <p className='text-sm text-gray-700 line-clamp-2'>{incident.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
