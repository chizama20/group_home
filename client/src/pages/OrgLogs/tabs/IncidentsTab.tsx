import { useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react'
import type { Home } from '../../../api/homes'
import { cn } from '../../../lib/cn'

// Placeholder types for incidents
interface OrgIncident {
  id: string
  homeId: string
  homeName: string
  residentName: string
  severity: 'low' | 'medium' | 'high'
  type: string
  description: string
  createdAt: string
  status: 'needs_signoff' | 'resolved'
}

// Placeholder data
const PLACEHOLDER_INCIDENTS: OrgIncident[] = []

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All severities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

interface Props {
  selectedHomeId: string
  homes: Home[]
}

export default function IncidentsTab({ selectedHomeId }: Props) {
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  // Filter incidents based on home and severity
  const filteredIncidents = PLACEHOLDER_INCIDENTS.filter(incident => {
    if (selectedHomeId !== 'all' && incident.homeId !== selectedHomeId) return false
    if (severityFilter !== 'all' && incident.severity !== severityFilter) return false
    return true
  })

  const needsSignoff = filteredIncidents.filter(i => i.status === 'needs_signoff')
  const resolved = filteredIncidents.filter(i => i.status === 'resolved')

  function getSeverityBadge(severity: 'low' | 'medium' | 'high') {
    const config = {
      high: 'bg-red-500/10 text-red-600 dark:text-red-400',
      medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    }
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', config[severity])}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    )
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className='pb-4'>
      {/* Severity filter */}
      <div className='px-4 pt-4 pb-2'>
        <div className='flex gap-2 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
          {SEVERITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSeverityFilter(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] border shrink-0',
                severityFilter === opt.value
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Needs Sign-off Section */}
      <div className='px-4 pt-4'>
        <div className='flex items-center gap-2 mb-3'>
          <Clock size={16} className='text-amber-500' />
          <h2 className='text-sm font-semibold text-zinc-900 dark:text-white'>
            Needs Sign-off
          </h2>
          <span className='bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full'>
            {needsSignoff.length}
          </span>
        </div>

        {needsSignoff.length === 0 ? (
          <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center'>
            <AlertTriangle size={32} className='text-zinc-300 dark:text-zinc-700 mx-auto mb-2' />
            <p className='text-sm text-zinc-500 dark:text-zinc-400'>
              No incidents pending sign-off
            </p>
            <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
              Incidents requiring manager review will appear here
            </p>
          </div>
        ) : (
          <div className='space-y-2'>
            {needsSignoff.map(incident => (
              <div
                key={incident.id}
                className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors'
              >
                <div className='flex items-start justify-between gap-2 mb-1'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      {getSeverityBadge(incident.severity)}
                      <span className='text-xs text-zinc-400 dark:text-zinc-500'>{incident.homeName}</span>
                    </div>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                      {incident.type}
                    </p>
                    <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
                      {incident.residentName}
                    </p>
                  </div>
                  <ChevronRight size={16} className='text-zinc-400 shrink-0 mt-1' />
                </div>
                <p className='text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-2'>
                  {incident.description}
                </p>
                <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-2'>
                  {formatDate(incident.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Section */}
      <div className='px-4 pt-6'>
        <div className='flex items-center gap-2 mb-3'>
          <CheckCircle size={16} className='text-emerald-500' />
          <h2 className='text-sm font-semibold text-zinc-900 dark:text-white'>
            Resolved
          </h2>
          <span className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full'>
            {resolved.length}
          </span>
        </div>

        {resolved.length === 0 ? (
          <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center'>
            <CheckCircle size={32} className='text-zinc-300 dark:text-zinc-700 mx-auto mb-2' />
            <p className='text-sm text-zinc-500 dark:text-zinc-400'>
              No resolved incidents
            </p>
            <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
              Signed-off and closed incidents will appear here
            </p>
          </div>
        ) : (
          <div className='space-y-2'>
            {resolved.map(incident => (
              <div
                key={incident.id}
                className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5'
              >
                <div className='flex items-start justify-between gap-2 mb-1'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      {getSeverityBadge(incident.severity)}
                      <span className='text-xs text-zinc-400 dark:text-zinc-500'>{incident.homeName}</span>
                    </div>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                      {incident.type}
                    </p>
                    <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
                      {incident.residentName}
                    </p>
                  </div>
                </div>
                <p className='text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-2'>
                  {incident.description}
                </p>
                <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-2'>
                  {formatDate(incident.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
