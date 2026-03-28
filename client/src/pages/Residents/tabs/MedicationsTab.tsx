import { useState, useEffect, type FormEvent } from 'react'
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

  return (
    <>
      <div className='fixed inset-0 bg-black/40 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[90vh] flex flex-col'>
        <div className='w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 shrink-0' />
        <div className='px-4 pt-3 pb-2 border-b border-gray-100 shrink-0'>
          <h2 className='text-base font-semibold text-gray-900'>
            {isEdit ? 'Edit medication' : 'Add medication'}
          </h2>
        </div>
        <form
          onSubmit={e => { void handleSubmit(e) }}
          className='overflow-y-auto flex-1 px-4 py-4 space-y-3 pb-8'
        >
          <input
            type='text' placeholder='Medication name' required value={name}
            onChange={e => setName(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <input
            type='text' placeholder='Dose (e.g. 5mg)' required value={dosage}
            onChange={e => setDosage(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <input
            type='text' placeholder='Frequency (e.g. daily, twice daily)' required value={frequency}
            onChange={e => setFrequency(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <div>
            <label className='block text-xs text-gray-500 mb-1'>Scheduled time</label>
            <input
              type='time' required value={time}
              onChange={e => setTime(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
          <input
            type='text' placeholder='Instructions (e.g. Give with food)' value={instructions}
            onChange={e => setInstructions(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <input
            type='text' placeholder='Prescriber' value={prescriber}
            onChange={e => setPrescriber(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
          />

          {error && <p className='text-xs text-red-600'>{error}</p>}

          <div className='flex gap-2 pt-2'>
            <button
              type='button' onClick={onCancel}
              className='flex-1 border border-gray-300 rounded-xl py-3 text-sm text-gray-600 min-h-[44px]'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={saving || !name.trim() || !dosage.trim() || !frequency.trim() || !time}
              className='flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add medication'}
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
  const { isManagerOrAbove }          = useRole()
  const [meds, setMeds]               = useState<Medication[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [showAdd, setShowAdd]         = useState(false)
  const [editing, setEditing]         = useState<Medication | null>(null)
  const [confirmDel, setConfirmDel]   = useState<string | null>(null)

  function load() {
    setLoading(true)
    getResidentMedications(residentId)
      .then(res => setMeds(res.data.data?.filter(m => m.is_active) ?? []))
      .catch(() => setError('Failed to load medications'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [residentId])

  async function handleDelete(id: string) {
    try {
      await deleteMedication(id)
      setConfirmDel(null)
      load()
    } catch {/* ignore */}
  }

  if (loading) return <p className='p-4 text-sm text-gray-500'>Loading…</p>
  if (error)   return <p className='p-4 text-sm text-red-600'>{error}</p>

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
          className='w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 min-h-[44px] hover:border-blue-300 hover:text-blue-500 transition-colors'
        >
          + Add medication
        </button>
      )}

      {!meds.length && !loading && (
        <p className='text-sm text-gray-500 text-center py-4'>No active medications</p>
      )}

      {sorted.map(([time, items]) => (
        <div key={time} className='bg-white rounded-xl shadow-sm overflow-hidden'>
          <div className='px-4 py-2 bg-gray-50 border-b border-gray-100'>
            <span className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>{time}</span>
          </div>
          {items.map(med => (
            <div key={med.id} className='px-4 py-3 border-b border-gray-50 last:border-0'>
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-semibold text-gray-900'>{med.name}</p>
                  <p className='text-xs text-gray-500 mt-0.5'>{med.dosage} · {med.frequency}</p>
                  {med.instructions && (
                    <p className='text-xs text-gray-400 mt-1 italic'>{med.instructions}</p>
                  )}
                  {med.prescriber && (
                    <p className='text-xs text-gray-400 mt-0.5'>Prescribed by {med.prescriber}</p>
                  )}
                </div>

                {/* Manager controls */}
                {isManagerOrAbove && (
                  <div className='flex gap-1 shrink-0 mt-0.5'>
                    <button
                      onClick={() => setEditing(med)}
                      aria-label='Edit medication'
                      className='w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors text-sm'
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setConfirmDel(med.id)}
                      aria-label='Delete medication'
                      className='w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors'
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Inline delete confirmation */}
              {confirmDel === med.id && (
                <div className='mt-2 pt-2 border-t border-red-100 flex items-center justify-between gap-2'>
                  <p className='text-xs text-red-600'>Delete {med.name}?</p>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => setConfirmDel(null)}
                      className='text-xs text-gray-500 px-3 py-1.5 border border-gray-200 rounded-lg min-h-[32px]'
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
