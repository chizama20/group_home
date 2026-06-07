import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import type { Home } from '../../../api/homes'
import { getOrgIncidents, type OrgIncident } from '../../../api/orgs'
import { signOffIncident } from '../../../api/incidents'
import { cn } from '../../../lib/cn'
import { formatDate } from '../../../utils/date'

const SEVERITY_OPTIONS = [
  { value: 'all',    label: 'All' },
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]

interface Props {
  selectedHomeId: string
  homes: Home[]
}

function severityBadge(severity: OrgIncident['severity']) {
  const cfg = {
    high:   'bg-red-500/10 text-red-400',
    medium: 'bg-amber-500/10 text-amber-400',
    low:    'bg-emerald-500/10 text-emerald-400',
  }
  if (!severity) return null
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', cfg[severity])}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  )
}

export default function IncidentsTab({ selectedHomeId }: Props) {
  const [incidents,  setIncidents]  = useState<OrgIncident[]>([])
  const [loading,    setLoading]    = useState(true)
  const [severity,   setSeverity]   = useState('all')
  const [signingOff, setSigningOff] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params: { home_id?: string; severity?: string } = {}
    if (selectedHomeId !== 'all') params.home_id = selectedHomeId
    if (severity !== 'all') params.severity = severity
    getOrgIncidents(params)
      .then(res => setIncidents(res.data.data ?? []))
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false))
  }, [selectedHomeId, severity])

  useEffect(() => { load() }, [load])

  async function handleSignOff(id: string) {
    setSigningOff(id)
    try { await signOffIncident(id); load() }
    catch { /* non-critical */ }
    finally { setSigningOff(null) }
  }

  const needsAction = incidents.filter(i => i.status === 'open' || i.status === 'reviewed' || i.status === 'escalated')
  const resolved    = incidents.filter(i => i.status === 'signed_off' || i.status === 'closed')

  return (
    <div className='pb-4'>
      {/* Severity filter chips */}
      <div className='px-4 pt-4 pb-2 flex gap-2 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
        {SEVERITY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSeverity(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] border shrink-0',
              severity === opt.value
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Skeleton */}
      {loading && (
        <div className='px-4 pt-2 space-y-3'>
          {[0, 1, 2].map(i => (
            <div key={i} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2 animate-pulse'>
              <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2' />
              <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3' />
              <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3' />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Needs Action */}
          <div className='px-4 pt-4'>
            <div className='flex items-center gap-2 mb-3'>
              <Clock size={16} className='text-amber-500' />
              <h2 className='text-sm font-semibold text-zinc-900 dark:text-white'>Needs Action</h2>
              <span className='bg-amber-500/10 text-amber-500 text-xs font-semibold px-2 py-0.5 rounded-full'>
                {needsAction.length}
              </span>
            </div>

            {needsAction.length === 0 ? (
              <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center'>
                <AlertTriangle size={28} className='text-zinc-300 dark:text-zinc-700 mx-auto mb-2' />
                <p className='text-sm text-zinc-500 dark:text-zinc-400'>No incidents pending action</p>
              </div>
            ) : (
              <div className='space-y-2'>
                {needsAction.map(incident => (
                  <div key={incident.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5'>
                    <div className='flex items-start justify-between gap-2 mb-1'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap mb-1'>
                          {severityBadge(incident.severity)}
                          <span className='text-xs text-zinc-400 dark:text-zinc-500'>{incident.home_name}</span>
                          {incident.status === 'escalated' && (
                            <span className='text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full'>Escalated</span>
                          )}
                        </div>
                        <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                          {incident.incident_type ?? incident.title}
                        </p>
                        <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
                          {incident.resident_first} {incident.resident_last}
                        </p>
                      </div>
                    </div>
                    <p className='text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1.5'>{incident.description}</p>
                    <div className='flex items-center justify-between mt-2'>
                      <p className='text-xs text-zinc-400 dark:text-zinc-500'>{formatDate(incident.created_at)}</p>
                      <button
                        onClick={() => { void handleSignOff(incident.id) }}
                        disabled={signingOff === incident.id}
                        className='text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-lg px-3 py-1.5 min-h-[32px] disabled:opacity-50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors'
                      >
                        {signingOff === incident.id ? 'Signing…' : 'Sign off'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolved */}
          <div className='px-4 pt-6'>
            <div className='flex items-center gap-2 mb-3'>
              <CheckCircle size={16} className='text-emerald-500' />
              <h2 className='text-sm font-semibold text-zinc-900 dark:text-white'>Resolved</h2>
              <span className='bg-emerald-500/10 text-emerald-500 text-xs font-semibold px-2 py-0.5 rounded-full'>
                {resolved.length}
              </span>
            </div>

            {resolved.length === 0 ? (
              <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center'>
                <CheckCircle size={28} className='text-zinc-300 dark:text-zinc-700 mx-auto mb-2' />
                <p className='text-sm text-zinc-500 dark:text-zinc-400'>No resolved incidents</p>
              </div>
            ) : (
              <div className='space-y-2'>
                {resolved.map(incident => (
                  <div key={incident.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5'>
                    <div className='flex items-center gap-2 flex-wrap mb-1'>
                      {severityBadge(incident.severity)}
                      <span className='text-xs text-zinc-400 dark:text-zinc-500'>{incident.home_name}</span>
                    </div>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                      {incident.incident_type ?? incident.title}
                    </p>
                    <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
                      {incident.resident_first} {incident.resident_last}
                    </p>
                    <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1.5'>{formatDate(incident.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
