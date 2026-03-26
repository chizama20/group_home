import { useState } from 'react'
import type { MedicationOutcome } from '../../types/medication'
import { cn } from '../../lib/cn'

const OPTIONS: { value: MedicationOutcome; label: string; classes: string; activeClasses: string }[] = [
  { value: 'given',   label: 'Given',   classes: 'border-green-200 text-green-700',  activeClasses: 'bg-green-600 text-white border-green-600' },
  { value: 'partial', label: 'Partial', classes: 'border-amber-200 text-amber-700',  activeClasses: 'bg-amber-500 text-white border-amber-500' },
  { value: 'refused', label: 'Refused', classes: 'border-red-200   text-red-700',    activeClasses: 'bg-red-600   text-white border-red-600' },
]

interface Props {
  selectedCount: number
  onConfirm:     (outcome: MedicationOutcome, notes: string) => Promise<void>
  onCancel:      () => void
}

export default function OutcomeScreen({ selectedCount, onConfirm, onCancel }: Props) {
  const [outcome, setOutcome]   = useState<MedicationOutcome | null>(null)
  const [notes, setNotes]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const refusedSelected = outcome === 'refused'
  const canSubmit = !!outcome && (!refusedSelected || notes.trim().length > 0) && !submitting

  async function handleConfirm() {
    if (!outcome) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(outcome, notes)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record administration')
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 pb-8'>
        <div className='w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3' />
        <div className='px-4 pt-4'>
          <p className='text-sm font-semibold text-gray-900 mb-1'>
            Administering {selectedCount} medication{selectedCount !== 1 ? 's' : ''}
          </p>
          <p className='text-xs text-gray-500 mb-5'>Select outcome for all selected medications</p>

          {/* Outcome options */}
          <div className='grid grid-cols-3 gap-3 mb-5'>
            {OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => { setOutcome(o.value); setNotes('') }}
                className={cn(
                  'py-4 rounded-xl text-sm font-semibold border-2 min-h-[72px] transition-all',
                  outcome === o.value ? o.activeClasses : `bg-white ${o.classes}`
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Notes — required for Refused */}
          {refusedSelected && (
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Reason for refusal <span className='text-red-500'>*</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder='Explain why the medication was refused…'
                rows={3}
                className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                autoFocus
              />
            </div>
          )}

          {/* Optional notes for other outcomes */}
          {outcome && outcome !== 'refused' && (
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder='Any notes…'
                rows={2}
                className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          )}

          {error && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3'>{error}</p>
          )}

          <div className='flex gap-3'>
            <button
              onClick={onCancel}
              className='flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 min-h-[44px]'
            >
              Cancel
            </button>
            <button
              onClick={() => { void handleConfirm() }}
              disabled={!canSubmit}
              className='flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              {submitting ? 'Recording…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
