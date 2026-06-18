import { useState, useEffect, type FormEvent } from 'react'
import { getHomeMar, administerMedication } from '../../api/medications'
import type { HomeMarEntry, MedicationOutcome } from '../../types/medication'

const OUTCOMES: { value: MedicationOutcome; label: string }[] = [
  { value: 'given',    label: 'Given' },
  { value: 'partial',  label: 'Partial' },
  { value: 'refused',  label: 'Refused' },
  { value: 'missed',   label: 'Missed' },
  { value: 'held',     label: 'Held' },
]

const OUTCOME_STYLES: Record<MedicationOutcome, string> = {
  given:   'bg-emerald-500/10 text-emerald-400',
  partial: 'bg-blue-500/10 text-blue-400',
  refused: 'bg-amber-500/10 text-amber-500',
  missed:  'bg-red-500/10 text-red-400',
  held:    'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400',
}

const OUTCOME_LABELS: Record<MedicationOutcome, string> = {
  given:   'Given',
  partial: 'Partial',
  refused: 'Refused',
  missed:  'Missed',
  held:    'Held',
}

function formatTime(time: string | null): string {
  if (!time) return 'Unscheduled'
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function isTooEarly(scheduledTime: string | null): boolean {
  if (!scheduledTime) return false
  const now = new Date()
  const [h, m] = scheduledTime.split(':').map(Number)
  return now.getHours() < h || (now.getHours() === h && now.getMinutes() < m)
}

// Group home MAR entries by scheduled_time, then by resident within each time
function groupByTime(entries: HomeMarEntry[]): Map<string, Map<string, HomeMarEntry[]>> {
  const byTime = new Map<string, Map<string, HomeMarEntry[]>>()
  for (const e of entries) {
    const timeKey = e.scheduled_time ?? 'unscheduled'
    if (!byTime.has(timeKey)) byTime.set(timeKey, new Map())
    const byResident = byTime.get(timeKey)!
    const resKey = e.resident_id
    const group = byResident.get(resKey) ?? []
    group.push(e)
    byResident.set(resKey, group)
  }
  return byTime
}

// ── Administer bottom sheet ────────────────────────────────────────────────────

interface AdminFormProps {
  entry: HomeMarEntry
  onSuccess: () => void
  onCancel: () => void
}

function AdminForm({ entry, onSuccess, onCancel }: AdminFormProps) {
  const [outcome, setOutcome] = useState<MedicationOutcome>('given')
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await administerMedication(entry.medication_id, { outcome, notes: notes.trim() || undefined })
      onSuccess()
    } catch {
      setError('Failed to record administration')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <>
      <div className='fixed inset-0 bg-black/60 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-xl md:rounded-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto'>
        <div className='w-9 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-4' />
        <div className='px-4 mb-4'>
          <p className='text-base font-semibold text-zinc-900 dark:text-white'>Administer medication</p>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-0.5'>
            {entry.resident_first} {entry.resident_last} · {entry.med_name} · {entry.med_dosage}
          </p>
        </div>
        <form onSubmit={e => { void handleSubmit(e) }} className='px-4 pb-8 space-y-3'>
          <div className='grid grid-cols-5 gap-1.5'>
            {OUTCOMES.map(o => (
              <button
                key={o.value}
                type='button'
                onClick={() => setOutcome(o.value)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[40px] ${
                  outcome === o.value
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <textarea
            placeholder='Notes (optional)'
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className={inputClass + ' resize-none'}
          />

          {error && (
            <div className='bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
              {error}
            </div>
          )}

          <div className='space-y-2 pt-1'>
            <button
              type='submit'
              disabled={saving}
              className='w-full bg-primary text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              {saving ? 'Saving…' : 'Record administration'}
            </button>
            <button
              type='button'
              onClick={onCancel}
              className='w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl py-3 text-sm font-semibold min-h-[44px]'
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Main tab ───────────────────────────────────────────────────────────────────

export default function MedsTab({ homeId }: { homeId: string }) {
  const today = new Date().toISOString().split('T')[0]

  const [entries,    setEntries]    = useState<HomeMarEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [adminEntry, setAdminEntry] = useState<HomeMarEntry | null>(null)

  function load() {
    setLoading(true)
    getHomeMar(homeId, today)
      .then(res => setEntries(res.data.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [homeId])

  const byTime    = groupByTime(entries)
  const timesSorted = [...byTime.keys()].sort((a, b) =>
    a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : a.localeCompare(b)
  )

  const pendingCount = entries.filter(e => !e.log_id && !isTooEarly(e.scheduled_time)).length

  return (
    <div className='p-4 space-y-3'>

      {/* Summary strip */}
      <div className='flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3'>
        <div>
          <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>Medication pass</p>
        </div>
        {!loading && pendingCount > 0 && (
          <span className='text-xs font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full'>
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && [0, 1, 2, 3].map(i => (
        <div key={i} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg h-20 animate-pulse' />
      ))}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center'>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No medications scheduled for any residents.</p>
        </div>
      )}

      {/* Time-grouped medication pass */}
      {!loading && timesSorted.map(timeKey => {
        const byResident = byTime.get(timeKey)!
        const residentsSorted = [...byResident.entries()].sort(([, a], [, b]) =>
          a[0].resident_last.localeCompare(b[0].resident_last)
        )

        return (
          <div key={timeKey} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'>
            {/* Time header */}
            <div className='px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800'>
              <span className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
                {timeKey === 'unscheduled' ? 'Unscheduled' : formatTime(timeKey)}
              </span>
            </div>

            {residentsSorted.map(([residentId, meds]) => {
              const r = meds[0]
              return (
                <div key={residentId} className='border-b border-zinc-100 dark:border-zinc-800 last:border-0'>
                  {/* Resident name row */}
                  <div className='px-4 pt-2.5 pb-1'>
                    <p className='text-[13px] font-semibold text-zinc-700 dark:text-zinc-300'>
                      {r.resident_first} {r.resident_last}
                      {r.room && <span className='ml-1.5 text-zinc-400 font-normal'>Rm {r.room}</span>}
                    </p>
                  </div>

                  {/* Medications for this resident at this time */}
                  {meds.map(entry => {
                    const hasLog   = !!entry.log_id
                    const tooEarly = !hasLog && isTooEarly(entry.scheduled_time)

                    return (
                      <div key={entry.medication_id} className='px-4 pb-3'>
                        <div className='flex items-center justify-between gap-3'>
                          <div className='min-w-0 flex-1'>
                            <p className='text-sm text-zinc-900 dark:text-white'>{entry.med_name}</p>
                            <p className='text-xs text-zinc-400 dark:text-zinc-500'>{entry.med_dosage} · {entry.med_frequency}</p>
                            {hasLog && entry.admin_first && (
                              <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-0.5'>
                                by {entry.admin_first} {entry.admin_last}
                              </p>
                            )}
                          </div>

                          <div className='shrink-0'>
                            {hasLog ? (
                              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${OUTCOME_STYLES[entry.outcome!]}`}>
                                {OUTCOME_LABELS[entry.outcome!]}
                              </span>
                            ) : tooEarly ? (
                              <span className='text-[11px] font-medium text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 whitespace-nowrap'>
                                Due {formatTime(entry.scheduled_time)}
                              </span>
                            ) : (
                              <button
                                onClick={() => setAdminEntry(entry)}
                                className='text-xs font-semibold text-primary dark:text-primary px-3 py-1.5 rounded-xl border border-primary dark:border-primary/50 min-h-[32px] hover:bg-primary dark:hover:bg-primary/10 transition-colors'
                              >
                                Administer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Administer sheet */}
      {adminEntry && (
        <AdminForm
          entry={adminEntry}
          onSuccess={() => { setAdminEntry(null); load() }}
          onCancel={() => setAdminEntry(null)}
        />
      )}
    </div>
  )
}
