import { useState } from 'react'
import { X } from 'lucide-react'
import { logVital, acknowledgeVital } from '../api/logs'
import { cn } from '../lib/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

interface VitalConfig {
  vital_type: string
  label?: string
  meal_timing?: string
  unit?: string
  target_min?: number
  target_max?: number
}

interface Props {
  residentId: string
  residentVitalsConfig: VitalConfig[]
  onSuccess: () => void
  onCancel: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VITAL_TYPE_LABELS: Record<string, string> = {
  blood_glucose:  'Blood Glucose',
  blood_pressure: 'Blood Pressure',
  weight:         'Weight',
  temperature:    'Temperature',
  pulse:          'Pulse',
  oxygen_sat:     'Oxygen Saturation',
  respirations:   'Respirations',
}

function vitalLabel(config: VitalConfig) {
  return config.label || VITAL_TYPE_LABELS[config.vital_type] || config.vital_type
}

const MEAL_TIMING_OPTIONS = [
  { value: 'pre_meal',  label: 'Pre-meal' },
  { value: 'post_meal', label: 'Post-meal' },
  { value: 'fasting',   label: 'Fasting' },
]

// ── Per-vital form state ──────────────────────────────────────────────────────

interface VitalFormState {
  valuePrimary: string
  valueSecondary: string   // for blood pressure diastolic
  mealTiming: string
  notes: string
}

function defaultState(config: VitalConfig): VitalFormState {
  return {
    valuePrimary: '',
    valueSecondary: '',
    mealTiming: config.meal_timing ?? '',
    notes: '',
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VitalsLogForm({ residentId, residentVitalsConfig, onSuccess, onCancel }: Props) {
  const [forms, setForms] = useState<Record<string, VitalFormState>>(
    () => Object.fromEntries(residentVitalsConfig.map(c => [c.vital_type, defaultState(c)]))
  )
  const [submitting, setSubmitting] = useState(false)
  const [flaggedVitals, setFlaggedVitals] = useState<Record<string, string>>({})  // vital_type -> vitals_log_id
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set())
  const [ackLoading, setAckLoading] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof VitalFormState>(vitalType: string, key: K, value: VitalFormState[K]) {
    setForms(prev => ({ ...prev, [vitalType]: { ...prev[vitalType], [key]: value } }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const newFlagged: Record<string, string> = {}

    try {
      for (const config of residentVitalsConfig) {
        const form = forms[config.vital_type]
        if (!form.valuePrimary) continue  // skip unfilled

        const primaryNum = parseFloat(form.valuePrimary)
        if (isNaN(primaryNum)) continue

        const payload: Parameters<typeof logVital>[1] = {
          vital_type: config.vital_type,
          value_primary: primaryNum,
          ...(form.valueSecondary && !isNaN(parseFloat(form.valueSecondary))
            ? { value_secondary: parseFloat(form.valueSecondary) } : {}),
          ...(form.mealTiming ? { meal_timing: form.mealTiming } : {}),
          ...(config.unit ? { unit: config.unit } : {}),
          ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        }

        const res = await logVital(residentId, payload)
        const { id, is_flagged } = res.data.data as { id: string; is_flagged: boolean }

        if (is_flagged) {
          newFlagged[config.vital_type] = id
        }
      }

      if (Object.keys(newFlagged).length > 0) {
        setFlaggedVitals(newFlagged)
      } else {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vitals')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAcknowledge(logId: string) {
    setAckLoading(prev => new Set(prev).add(logId))
    try {
      await acknowledgeVital(logId)
      setAcknowledgedIds(prev => new Set(prev).add(logId))
      // If all flagged vitals acknowledged, call onSuccess
      const newAcked = new Set([...acknowledgedIds, logId])
      const allDone  = Object.values(flaggedVitals).every(id => newAcked.has(id))
      if (allDone) onSuccess()
    } catch {
      // noop
    } finally {
      setAckLoading(prev => { const s = new Set(prev); s.delete(logId); return s })
    }
  }

  const hasFlagged = Object.keys(flaggedVitals).length > 0

  return (
    <>
      {/* Overlay */}
      <div className='fixed inset-0 bg-black/60 z-40' onClick={onCancel} />

      {/* Bottom sheet */}
      <div className='fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto'>
        <div className='w-9 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-4' />

        {/* Header */}
        <div className='px-4 mb-5 relative'>
          <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400'>Vitals</p>
          <p className='text-base font-semibold text-zinc-900 dark:text-white mt-0.5'>Log Vitals</p>
          <button
            onClick={onCancel}
            className='absolute top-0 right-4 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400'
          >
            <X size={14} />
          </button>
        </div>

        {/* No config state */}
        {residentVitalsConfig.length === 0 && (
          <div className='px-4 pb-8'>
            <p className='text-sm text-zinc-400 dark:text-zinc-500 text-center py-6'>
              No vitals configured for this resident.
            </p>
            <button
              onClick={onCancel}
              className='w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold py-3 rounded-xl min-h-[44px]'
            >
              Close
            </button>
          </div>
        )}

        {/* Vital sections */}
        {residentVitalsConfig.length > 0 && (
          <div className='px-4 space-y-4 mb-4'>
            {residentVitalsConfig.map(config => {
              const form    = forms[config.vital_type]
              const logId   = flaggedVitals[config.vital_type]
              const isFlagged = Boolean(logId)
              const isAcked   = logId ? acknowledgedIds.has(logId) : false
              const isAcking  = logId ? ackLoading.has(logId) : false

              return (
                <div
                  key={config.vital_type}
                  className={cn(
                    'bg-zinc-50 dark:bg-zinc-800/50 border rounded-lg p-4',
                    isFlagged && !isAcked
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-zinc-200 dark:border-zinc-700'
                  )}
                >
                  {/* Vital header */}
                  <div className='flex items-center justify-between mb-3'>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                      {vitalLabel(config)}
                    </p>
                    {isFlagged && !isAcked && (
                      <span className='text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full'>
                        FLAGGED
                      </span>
                    )}
                    {isAcked && (
                      <span className='text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full'>
                        ACKNOWLEDGED
                      </span>
                    )}
                  </div>

                  {/* Blood Glucose: meal timing + value */}
                  {config.vital_type === 'blood_glucose' && (
                    <div className='space-y-3'>
                      <div>
                        <label className='block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1'>
                          Meal Timing
                        </label>
                        <select
                          value={form.mealTiming}
                          onChange={e => setField(config.vital_type, 'mealTiming', e.target.value)}
                          className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'
                        >
                          <option value=''>Select timing…</option>
                          {MEAL_TIMING_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className='block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1'>
                          Value
                        </label>
                        <input
                          type='number'
                          value={form.valuePrimary}
                          onChange={e => setField(config.vital_type, 'valuePrimary', e.target.value)}
                          placeholder='mg/dL'
                          className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary placeholder-zinc-400'
                        />
                      </div>
                    </div>
                  )}

                  {/* Blood Pressure: systolic + diastolic */}
                  {config.vital_type === 'blood_pressure' && (
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <label className='block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1'>
                          Systolic
                        </label>
                        <input
                          type='number'
                          value={form.valuePrimary}
                          onChange={e => setField(config.vital_type, 'valuePrimary', e.target.value)}
                          placeholder='mmHg'
                          className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary placeholder-zinc-400'
                        />
                      </div>
                      <div>
                        <label className='block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1'>
                          Diastolic
                        </label>
                        <input
                          type='number'
                          value={form.valueSecondary}
                          onChange={e => setField(config.vital_type, 'valueSecondary', e.target.value)}
                          placeholder='mmHg'
                          className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary placeholder-zinc-400'
                        />
                      </div>
                    </div>
                  )}

                  {/* All other vitals: single value */}
                  {config.vital_type !== 'blood_glucose' && config.vital_type !== 'blood_pressure' && (
                    <div>
                      <label className='block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1'>
                        Value {config.unit && <span className='text-zinc-400'>({config.unit})</span>}
                      </label>
                      <input
                        type='number'
                        value={form.valuePrimary}
                        onChange={e => setField(config.vital_type, 'valuePrimary', e.target.value)}
                        placeholder={config.unit || 'Enter value'}
                        className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary placeholder-zinc-400'
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div className='mt-3'>
                    <label className='block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1'>
                      Notes <span className='text-zinc-400 font-normal'>(optional)</span>
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={e => setField(config.vital_type, 'notes', e.target.value)}
                      placeholder='Any relevant notes…'
                      rows={1}
                      className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder-zinc-400'
                    />
                  </div>

                  {/* Flagged acknowledgment button */}
                  {isFlagged && !isAcked && (
                    <button
                      onClick={() => { void handleAcknowledge(logId) }}
                      disabled={isAcking}
                      className='mt-3 w-full bg-red-500/10 border border-red-400 dark:border-red-500 text-red-500 dark:text-red-400 text-sm font-semibold py-2.5 rounded-xl min-h-[44px] disabled:opacity-50 active:bg-red-500/20 transition-colors'
                    >
                      {isAcking ? 'Notifying…' : 'Flagged — Notify Manager'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className='mx-4 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
            {error}
          </div>
        )}

        {/* Actions */}
        {residentVitalsConfig.length > 0 && (
          <div className='px-4 pb-8 flex gap-3'>
            <button
              onClick={onCancel}
              className='flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold py-3 rounded-xl min-h-[44px]'
            >
              Cancel
            </button>
            {!hasFlagged && (
              <button
                onClick={() => { void handleSubmit() }}
                disabled={submitting}
                className='flex-1 bg-primary text-white text-sm font-semibold py-3 rounded-xl min-h-[44px] disabled:opacity-50 active:bg-primary transition-colors'
              >
                {submitting ? 'Saving…' : 'Save Vitals'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
