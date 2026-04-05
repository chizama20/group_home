import { useState, useEffect, type FormEvent } from 'react'
import { Pencil, X } from 'lucide-react'
import { getResidentMedications, createMedication, updateMedication, deleteMedication } from '../../../api/medications'
import { useRole } from '../../../utils/role'
import type { Medication } from '../../../types/medication'

// ── Medication form (add / edit) ─────────────────────────────────────────────

interface MedFormProps {
  residentId:  string
  medication?: Medication   // present = edit mode
  onSuccess:   () => void
  onCancel:    () => void
}

function MedicationForm({ residentId, medication, onSuccess, onCancel }: MedFormProps) {
  const isEdit = Boolean(medication)

  const [name,      setName]      = useState(medication?.name ?? '')
  const [dosage,    setDosage]    = useState(medication?.dosage ?? '')
  const [frequency, setFrequency] = useState(medication?.frequency ?? '')
  const [time,      setTime]      = useState(medication?.scheduled_time?.slice(0, 5) ?? '')
  const [instructions, setInstructions] = useState(medication?.instructions ?? '')
  const [prescriber,   setPrescriber]   = useState(medication?.prescriber ?? '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !dosage.trim() || !frequency.trim() || !time) return
    setSaving(true)
    setError(null)
    const payload = {
      name:           name.trim(),
      dosage:         dosage.trim(),
      frequency:      frequency.trim(),
      scheduled_time: time,
      instructions:   instructions.trim() || null,
      prescriber:     prescriber.trim()   || null,
    }
    try {
      if (isEdit && medication) {
        await updateMedication(medication.id, payload)
      } else {
        await createMedication(residentId, payload)
      }
      onSuccess()
    } catch {
      setError('Failed to save medication')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <>
      <div className='fixed inset-0 bg-black/60 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-xl md:rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto'>
        <div className='w-9 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-4' />
        <p className='text-[17px] font-semibold text-zinc-900 dark:text-white px-4 mb-4'>
          {isEdit ? 'Edit medication' : 'Add medication'}
        </p>
        <form
          onSubmit={e => { void handleSubmit(e) }}
          className='px-4 pb-8 space-y-3'
        >
          <input
            type='text' placeholder='Medication name' required value={name}
            onChange={e => setName(e.target.value)}
            className={inputClass}
          />
          <input
            type='text' placeholder='Dose (e.g. 5mg)' required value={dosage}
            onChange={e => setDosage(e.target.value)}
            className={inputClass}
          />
          <input
            type='text' placeholder='Frequency (e.g. daily, twice daily)' required value={frequency}
            onChange={e => setFrequency(e.target.value)}
            className={inputClass}
          />
          <div>
            <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>Scheduled time</label>
            <input
              type='time' required value={time}
              onChange={e => setTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <input
            type='text' placeholder='Instructions (e.g. Give with food)' value={instructions}
            onChange={e => setInstructions(e.target.value)}
            className={inputClass}
          />
          <input
            type='text' placeholder='Prescriber' value={prescriber}
            onChange={e => setPrescriber(e.target.value)}
            className={inputClass}
          />

          {error && (
            <div className='bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
              {error}
            </div>
          )}

          <div className='space-y-2 pt-2'>
            <button
              type='submit'
              disabled={saving || !name.trim() || !dosage.trim() || !frequency.trim() || !time}
              className='w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add medication'}
            </button>
            <button
              type='button' onClick={onCancel}
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

// ── Main tab ─────────────────────────────────────────────────────────────────

function groupByTime(meds: Medication[]): Map<string, Medication[]> {
  const map = new Map<string, Medication[]>()
  for (const m of meds) {
    const key = m.scheduled_time ?? 'Unscheduled'
    const group = map.get(key) ?? []
    group.push(m)
    map.set(key, group)
  }
  return map
}

export default function MedicationsTab({ residentId }: { residentId: string }) {
  const { isManagerOrAbove }        = useRole()
  const [meds, setMeds]             = useState<Medication[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [editing, setEditing]       = useState<Medication | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [delError,   setDelError]   = useState<string | null>(null)

  function load() {
    setLoading(true)
    getResidentMedications(residentId)
      .then(res => setMeds(res.data.data?.filter(m => m.is_active) ?? []))
      .catch(() => setError('Failed to load medications'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [residentId])

  async function handleDelete(id: string) {
    setDelError(null)
    try {
      await deleteMedication(id)
      setConfirmDel(null)
      load()
    } catch {
      setDelError('Failed to delete medication')
    }
  }

  if (loading) return (
    <div className='flex items-center justify-center min-h-[200px]'>
      <div className='w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
    </div>
  )
  if (error) return <p className='px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400'>{error}</p>

  const groups = groupByTime(meds)
  const sorted = [...groups.entries()].sort(([a], [b]) =>
    a === 'Unscheduled' ? 1 : b === 'Unscheduled' ? -1 : a.localeCompare(b)
  )

  return (
    <div className='space-y-3 p-4'>

      {/* Manager: Add medication button */}
      {isManagerOrAbove && (
        <button
          onClick={() => setShowAdd(true)}
          className='w-full border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl py-3 text-sm text-zinc-400 dark:text-zinc-600 min-h-[44px] hover:border-indigo-400 hover:text-indigo-500 transition-colors'
        >
          + Add medication
        </button>
      )}

      {!meds.length && !loading && (
        <p className='text-center py-8 text-sm text-zinc-400 dark:text-zinc-600'>No active medications</p>
      )}

      {sorted.map(([time, items]) => (
        <div key={time} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden'>
          <div className='px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800'>
            <span className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>{time}</span>
          </div>
          {items.map(med => (
            <div key={med.id} className='px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0'>
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{med.name}</p>
                  <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>{med.dosage} · {med.frequency}</p>
                  {med.instructions && (
                    <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1 italic'>{med.instructions}</p>
                  )}
                  {med.prescriber && (
                    <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-0.5'>Prescribed by {med.prescriber}</p>
                  )}
                </div>

                {/* Manager controls */}
                {isManagerOrAbove && (
                  <div className='flex gap-1 shrink-0 mt-0.5'>
                    <button
                      onClick={() => setEditing(med)}
                      aria-label='Edit medication'
                      className='w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-indigo-500 rounded-full hover:bg-indigo-500/10 transition-colors'
                    >
                      <Pencil className='w-4 h-4' />
                    </button>
                    <button
                      onClick={() => setConfirmDel(med.id)}
                      aria-label='Delete medication'
                      className='w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  </div>
                )}
              </div>

              {/* Inline delete confirmation */}
              {confirmDel === med.id && (
                <div className='mt-2 pt-2 border-t border-red-500/20 space-y-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-xs text-red-400'>Delete {med.name}?</p>
                    <div className='flex gap-2'>
                      <button
                        onClick={() => { setConfirmDel(null); setDelError(null) }}
                        className='text-xs text-zinc-500 dark:text-zinc-400 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg min-h-[32px]'
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void handleDelete(med.id)}
                        className='text-xs text-white bg-red-600 px-3 py-1.5 rounded-lg min-h-[32px]'
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {delError && <p className='text-xs text-red-400'>{delError}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Add form */}
      {showAdd && (
        <MedicationForm
          residentId={residentId}
          onSuccess={() => { setShowAdd(false); load() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Edit form */}
      {editing && (
        <MedicationForm
          residentId={residentId}
          medication={editing}
          onSuccess={() => { setEditing(null); load() }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
