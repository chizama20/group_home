import { useState } from 'react'
import { X } from 'lucide-react'
import type { Incident } from '../../types/incident'
import { signOffIncident, escalateIncident } from '../../api/incidents'
import { formatDate } from '../../utils/date'
import { cn } from '../../lib/cn'
import StatusBadge from '../../components/StatusBadge'

interface Props {
  incident: Incident
  onClose:  () => void
  onUpdate: () => void
}

export default function IncidentReviewSheet({ incident, onClose, onUpdate }: Props) {
  const [signingOff,  setSigningOff]  = useState(false)
  const [escalating,  setEscalating]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const canAct = incident.status === 'open' || incident.status === 'reviewed'

  async function handleSignOff() {
    setSigningOff(true)
    setError(null)
    try {
      await signOffIncident(incident.id)
      onUpdate()
      onClose()
    } catch {
      setError('Failed to sign off')
    } finally {
      setSigningOff(false)
    }
  }

  async function handleEscalate() {
    setEscalating(true)
    setError(null)
    try {
      await escalateIncident(incident.id)
      onUpdate()
      onClose()
    } catch {
      setError('Failed to escalate')
    } finally {
      setEscalating(false)
    }
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/40 z-40' onClick={onClose} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-xl md:rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 max-h-[90vh] flex flex-col'>
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 shrink-0 md:hidden' />

        <div className='px-4 pt-3 pb-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-between'>
          <p className='text-base font-semibold text-zinc-900 dark:text-white'>Incident Review</p>
          <button
            onClick={onClose}
            className='text-zinc-400 dark:text-zinc-500 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='overflow-y-auto flex-1 px-4 py-4 pb-8 space-y-4'>

          <div className='flex items-start justify-between gap-2'>
            <div>
              <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                {incident.incident_type ?? incident.title}
              </p>
              {incident.resident_first && (
                <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
                  {incident.resident_first} {incident.resident_last}
                </p>
              )}
              <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-0.5'>{formatDate(incident.created_at)}</p>
            </div>
            <StatusBadge status={incident.status} />
          </div>

          {incident.severity && (
            <span className={cn(
              'inline-block text-xs font-semibold px-3 py-1 rounded-full',
              incident.severity === 'high'
                ? 'bg-red-500/10 text-red-500 dark:text-red-400'
                : incident.severity === 'medium'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            )}>
              {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)} severity
            </span>
          )}

          {incident.occurred_at && (
            <div className='bg-zinc-50 dark:bg-zinc-800/60 rounded-xl px-4 py-3'>
              <p className='text-xs text-zinc-400 dark:text-zinc-500 mb-0.5'>Time occurred</p>
              <p className='text-sm text-zinc-900 dark:text-white'>{formatDate(incident.occurred_at)}</p>
            </div>
          )}

          <div className='bg-zinc-50 dark:bg-zinc-800/60 rounded-xl px-4 py-3'>
            <p className='text-xs text-zinc-400 dark:text-zinc-500 mb-1'>Description</p>
            <p className='text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap'>{incident.description}</p>
          </div>

          {incident.signed_off_at && (
            <div className='bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3'>
              <p className='text-xs text-emerald-600 dark:text-emerald-400 font-semibold'>Signed off</p>
              <p className='text-xs text-emerald-700 dark:text-emerald-500 mt-0.5'>{formatDate(incident.signed_off_at)}</p>
            </div>
          )}

          {incident.status === 'escalated' && (
            <div className='bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3'>
              <p className='text-xs text-red-400 font-semibold'>Escalated</p>
              <p className='text-xs text-red-400/70 mt-0.5'>This incident has been flagged for escalation.</p>
            </div>
          )}

          {error && (
            <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg'>{error}</p>
          )}

          {canAct && (
            <div className='space-y-2'>
              <button
                onClick={() => { void handleSignOff() }}
                disabled={signingOff || escalating}
                className='w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 transition-colors'
              >
                {signingOff ? 'Signing off…' : 'Sign off incident'}
              </button>
              <button
                onClick={() => { void handleEscalate() }}
                disabled={signingOff || escalating}
                className='w-full bg-red-600/10 border border-red-500/30 text-red-400 rounded-xl py-3 text-sm font-semibold min-h-[44px] hover:bg-red-600/20 disabled:opacity-50 transition-colors'
              >
                {escalating ? 'Escalating…' : 'Escalate incident'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
