import { useState } from 'react'
import type { Incident } from '../../types/incident'
import { signOffIncident } from '../../api/incidents'
import { formatDate } from '../../utils/date'
import { cn } from '../../lib/cn'
import StatusBadge from '../../components/StatusBadge'

interface Props {
  incident: Incident
  onClose:  () => void
  onUpdate: () => void
}

export default function IncidentReviewSheet({ incident, onClose, onUpdate }: Props) {
  const [signingOff, setSigningOff]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const canSignOff = incident.status === 'open' || incident.status === 'reviewed'

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

  return (
    <>
      <div className='fixed inset-0 bg-black/40 z-40' onClick={onClose} />
      <div className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[90vh] flex flex-col'>
        <div className='w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 shrink-0' />

        <div className='px-4 pt-3 pb-2 border-b border-gray-100 shrink-0 flex items-center justify-between'>
          <p className='text-base font-semibold text-gray-900'>Incident Review</p>
          <button
            onClick={onClose}
            className='text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl'
          >
            ✕
          </button>
        </div>

        <div className='overflow-y-auto flex-1 px-4 py-4 pb-8 space-y-4'>

          {/* Status + type */}
          <div className='flex items-start justify-between gap-2'>
            <div>
              <p className='text-sm font-semibold text-gray-900'>
                {incident.incident_type ?? incident.title}
              </p>
              <p className='text-xs text-gray-400 mt-0.5'>{formatDate(incident.created_at)}</p>
            </div>
            <StatusBadge status={incident.status} />
          </div>

          {/* Severity */}
          {incident.severity && (
            <span className={cn(
              'inline-block text-xs font-semibold px-3 py-1 rounded-full',
              incident.severity === 'high'   ? 'bg-red-100 text-red-700' :
              incident.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                               'bg-green-100 text-green-700'
            )}>
              {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)} severity
            </span>
          )}

          {/* Occurred at */}
          {incident.occurred_at && (
            <div className='bg-gray-50 rounded-xl px-4 py-3'>
              <p className='text-xs text-gray-400 mb-0.5'>Time occurred</p>
              <p className='text-sm text-gray-900'>{formatDate(incident.occurred_at)}</p>
            </div>
          )}

          {/* Description */}
          <div className='bg-gray-50 rounded-xl px-4 py-3'>
            <p className='text-xs text-gray-400 mb-1'>Description</p>
            <p className='text-sm text-gray-900 whitespace-pre-wrap'>{incident.description}</p>
          </div>

          {/* Sign-off info */}
          {incident.signed_off_at && (
            <div className='bg-green-50 border border-green-100 rounded-xl px-4 py-3'>
              <p className='text-xs text-green-600 font-semibold'>Signed off</p>
              <p className='text-xs text-green-700 mt-0.5'>{formatDate(incident.signed_off_at)}</p>
            </div>
          )}

          {error && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{error}</p>
          )}

          {canSignOff && (
            <button
              onClick={() => { void handleSignOff() }}
              disabled={signingOff}
              className='w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              {signingOff ? 'Signing off…' : 'Sign off incident'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
