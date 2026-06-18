import { useState } from 'react'
import { X } from 'lucide-react'
import { logDeparture, logReturn } from '../api/logs'
import type { DayProgramLog } from '../types/log'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  residentId: string
  existingLog?: DayProgramLog
  onSuccess: () => void
  onCancel: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

function formatReadable(isoStr: string) {
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

const TRANSPORT_METHODS = [
  { value: 'personal_vehicle', label: 'Personal Vehicle' },
  { value: 'agency_van',       label: 'Agency Van' },
  { value: 'public_transit',   label: 'Public Transit' },
  { value: 'other',            label: 'Other' },
]

// ── Input / textarea style constants ─────────────────────────────────────────

const INPUT_CLS =
  'w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary placeholder-zinc-400'

const LABEL_CLS = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'

// ── Departure form ────────────────────────────────────────────────────────────

function DepartureForm({ residentId, onSuccess, onCancel }: { residentId: string; onSuccess: () => void; onCancel: () => void }) {
  const [programName,      setProgramName]      = useState('')
  const [programAddress,   setProgramAddress]   = useState('')
  const [transportStaff,   setTransportStaff]   = useState('')
  const [transportMethod,  setTransportMethod]  = useState('')
  const [departedAt,       setDepartedAt]       = useState(toLocalDatetimeValue(new Date()))
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleSubmit() {
    if (!programName.trim()) { setError('Program name is required'); return }
    setSubmitting(true)
    setError(null)
    try {
      await logDeparture(residentId, {
        program_name:     programName.trim(),
        program_address:  programAddress.trim() || undefined,
        transport_staff:  transportStaff.trim() || undefined,
        transport_method: transportMethod || undefined,
        departed_at:      departedAt ? new Date(departedAt).toISOString() : undefined,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log departure')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='px-4 space-y-4 mb-6'>
      {/* Program Name */}
      <div>
        <label className={LABEL_CLS}>
          Program Name <span className='text-red-500'>*</span>
        </label>
        <input
          type='text'
          value={programName}
          onChange={e => setProgramName(e.target.value)}
          placeholder='e.g. Sunrise Day Program'
          className={INPUT_CLS}
        />
      </div>

      {/* Program Address */}
      <div>
        <label className={LABEL_CLS}>Program Address</label>
        <input
          type='text'
          value={programAddress}
          onChange={e => setProgramAddress(e.target.value)}
          placeholder='123 Main St, City, State'
          className={INPUT_CLS}
        />
      </div>

      {/* Transport Staff */}
      <div>
        <label className={LABEL_CLS}>Transport Staff</label>
        <input
          type='text'
          value={transportStaff}
          onChange={e => setTransportStaff(e.target.value)}
          placeholder='Staff member transporting'
          className={INPUT_CLS}
        />
      </div>

      {/* Transport Method */}
      <div>
        <label className={LABEL_CLS}>Transport Method</label>
        <select
          value={transportMethod}
          onChange={e => setTransportMethod(e.target.value)}
          className={INPUT_CLS}
        >
          <option value=''>Select method…</option>
          {TRANSPORT_METHODS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Departure Time */}
      <div>
        <label className={LABEL_CLS}>Departure Time</label>
        <input
          type='datetime-local'
          value={departedAt}
          onChange={e => setDepartedAt(e.target.value)}
          className={INPUT_CLS}
        />
      </div>

      {error && (
        <div className='bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
          {error}
        </div>
      )}

      <div className='flex gap-3 pt-1 pb-4'>
        <button
          onClick={onCancel}
          className='flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold py-3 rounded-xl min-h-[44px]'
        >
          Cancel
        </button>
        <button
          onClick={() => { void handleSubmit() }}
          disabled={submitting}
          className='flex-1 bg-primary text-white text-sm font-semibold py-3 rounded-xl min-h-[44px] disabled:opacity-50 active:bg-primary transition-colors'
        >
          {submitting ? 'Logging…' : 'Log Departure'}
        </button>
      </div>
    </div>
  )
}

// ── Return form ───────────────────────────────────────────────────────────────

function ReturnForm({ existingLog, onSuccess, onCancel }: { existingLog: DayProgramLog; onSuccess: () => void; onCancel: () => void }) {
  const [returnedAt,   setReturnedAt]   = useState(toLocalDatetimeValue(new Date()))
  const [returnNotes,  setReturnNotes]  = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await logReturn(existingLog.id, {
        returned_at:  returnedAt ? new Date(returnedAt).toISOString() : undefined,
        return_notes: returnNotes.trim() || undefined,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log return')
    } finally {
      setSubmitting(false)
    }
  }

  const transportLabel = TRANSPORT_METHODS.find(m => m.value === existingLog.transport_method)?.label ?? existingLog.transport_method

  return (
    <div className='px-4 space-y-4 mb-6'>
      {/* Read-only departure info */}
      <div className='bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-2'>
        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2'>Departure Info</p>
        <div className='flex items-center justify-between'>
          <p className='text-xs text-zinc-500 dark:text-zinc-400'>Departed</p>
          <p className='text-xs font-medium text-zinc-900 dark:text-white'>{formatReadable(existingLog.departed_at)}</p>
        </div>
        {existingLog.transport_staff && (
          <div className='flex items-center justify-between'>
            <p className='text-xs text-zinc-500 dark:text-zinc-400'>Staff</p>
            <p className='text-xs font-medium text-zinc-900 dark:text-white'>{existingLog.transport_staff}</p>
          </div>
        )}
        {transportLabel && (
          <div className='flex items-center justify-between'>
            <p className='text-xs text-zinc-500 dark:text-zinc-400'>Transport</p>
            <p className='text-xs font-medium text-zinc-900 dark:text-white'>{transportLabel}</p>
          </div>
        )}
        {existingLog.program_address && (
          <div className='flex items-start justify-between gap-4'>
            <p className='text-xs text-zinc-500 dark:text-zinc-400 shrink-0'>Address</p>
            <p className='text-xs font-medium text-zinc-900 dark:text-white text-right'>{existingLog.program_address}</p>
          </div>
        )}
      </div>

      {/* Return Time */}
      <div>
        <label className={LABEL_CLS}>Return Time</label>
        <input
          type='datetime-local'
          value={returnedAt}
          onChange={e => setReturnedAt(e.target.value)}
          className={INPUT_CLS}
        />
      </div>

      {/* Notes */}
      <div>
        <label className={LABEL_CLS}>Notes <span className='text-zinc-400 font-normal text-xs'>(optional)</span></label>
        <textarea
          value={returnNotes}
          onChange={e => setReturnNotes(e.target.value)}
          placeholder='Any notes about the return…'
          rows={2}
          className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder-zinc-400'
        />
      </div>

      {error && (
        <div className='bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
          {error}
        </div>
      )}

      <div className='flex gap-3 pt-1 pb-4'>
        <button
          onClick={onCancel}
          className='flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold py-3 rounded-xl min-h-[44px]'
        >
          Cancel
        </button>
        <button
          onClick={() => { void handleSubmit() }}
          disabled={submitting}
          className='flex-1 bg-primary text-white text-sm font-semibold py-3 rounded-xl min-h-[44px] disabled:opacity-50 active:bg-primary transition-colors'
        >
          {submitting ? 'Logging…' : 'Log Return'}
        </button>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DayProgramLogForm({ residentId, existingLog, onSuccess, onCancel }: Props) {
  const title = existingLog
    ? `Log Return — ${existingLog.program_name}`
    : 'Log Day Program Departure'

  return (
    <>
      {/* Overlay */}
      <div className='fixed inset-0 bg-black/60 z-40' onClick={onCancel} />

      {/* Bottom sheet */}
      <div className='fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto'>
        <div className='w-9 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-4' />

        {/* Header */}
        <div className='px-4 mb-5 relative'>
          <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400'>
            {existingLog ? 'Day Program' : 'Day Program'}
          </p>
          <p className='text-base font-semibold text-zinc-900 dark:text-white mt-0.5 pr-10'>
            {title}
          </p>
          <button
            onClick={onCancel}
            className='absolute top-0 right-4 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400'
          >
            <X size={14} />
          </button>
        </div>

        {existingLog ? (
          <ReturnForm existingLog={existingLog} onSuccess={onSuccess} onCancel={onCancel} />
        ) : (
          <DepartureForm residentId={residentId} onSuccess={onSuccess} onCancel={onCancel} />
        )}
      </div>
    </>
  )
}
