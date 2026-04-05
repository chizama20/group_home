import { useState, type FormEvent } from 'react'
import { createResident, updateResident } from '../../api/residents'
import type { Resident } from '../../types/resident'

interface Props {
  homeId?:   string           // required for create
  resident?: Resident         // present for edit; absent for create
  onSuccess: () => void
  onCancel:  () => void
}

export default function ResidentForm({ homeId, resident, onSuccess, onCancel }: Props) {
  const isEdit = Boolean(resident)

  const [firstName,    setFirstName]    = useState(resident?.first_name ?? '')
  const [lastName,     setLastName]     = useState(resident?.last_name ?? '')
  const [dob,          setDob]          = useState(resident?.date_of_birth ?? '')
  const [room,         setRoom]         = useState(resident?.room ?? '')
  const [diagnosis,    setDiagnosis]    = useState(resident?.diagnosis ?? '')
  const [physician,    setPhysician]    = useState(resident?.physician ?? '')
  const [contactName,  setContactName]  = useState(resident?.primary_contact_name ?? '')
  const [contactPhone, setContactPhone] = useState(resident?.primary_contact_phone ?? '')
  const [contactRel,   setContactRel]   = useState(resident?.primary_contact_relation ?? '')
  const [notes,        setNotes]        = useState(resident?.notes ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !dob) return
    setSaving(true)
    setError(null)

    const payload = {
      first_name:               firstName.trim(),
      last_name:                lastName.trim(),
      date_of_birth:            dob,
      room:                     room.trim()         || null,
      diagnosis:                diagnosis.trim()    || null,
      physician:                physician.trim()    || null,
      primary_contact_name:     contactName.trim()  || null,
      primary_contact_phone:    contactPhone.trim() || null,
      primary_contact_relation: contactRel.trim()   || null,
      notes:                    notes.trim()        || null,
    }

    try {
      if (isEdit && resident) {
        await updateResident(resident.id, payload)
      } else if (homeId) {
        await createResident(homeId, payload)
      }
      onSuccess()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'
  const sectionLabelClass = 'text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2'

  return (
    <>
      <div className='fixed inset-0 bg-black/60 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto'>
        <div className='w-9 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-4' />

        <p className='text-[17px] font-semibold text-zinc-900 dark:text-white px-4 mb-4'>
          {isEdit ? 'Edit resident' : 'Add resident'}
        </p>

        <form
          onSubmit={e => { void handleSubmit(e) }}
          className='px-4 pb-8 space-y-4'
        >
          {/* Required fields */}
          <div>
            <p className={sectionLabelClass}>Required</p>
            <div className='space-y-3'>
              <input
                type='text' placeholder='First name' required value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className={inputClass}
              />
              <input
                type='text' placeholder='Last name' required value={lastName}
                onChange={e => setLastName(e.target.value)}
                className={inputClass}
              />
              <div>
                <label className={labelClass}>Date of birth</label>
                <input
                  type='date' required value={dob}
                  onChange={e => setDob(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Optional fields */}
          <div>
            <p className={sectionLabelClass}>Optional</p>
            <div className='space-y-3'>
              <input
                type='text' placeholder='Room number' value={room}
                onChange={e => setRoom(e.target.value)}
                className={inputClass}
              />
              <textarea
                placeholder='Diagnosis' rows={2} value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500'
              />
              <input
                type='text' placeholder='Physician name' value={physician}
                onChange={e => setPhysician(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Primary contact */}
          <div>
            <p className={sectionLabelClass}>Primary Contact</p>
            <div className='space-y-3'>
              <input
                type='text' placeholder='Contact name' value={contactName}
                onChange={e => setContactName(e.target.value)}
                className={inputClass}
              />
              <input
                type='tel' placeholder='Contact phone' value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className={inputClass}
              />
              <input
                type='text' placeholder='Relationship (e.g. daughter)' value={contactRel}
                onChange={e => setContactRel(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Notes */}
          <textarea
            placeholder='General notes' rows={3} value={notes}
            onChange={e => setNotes(e.target.value)}
            className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500'
          />

          {error && (
            <div className='bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
              {error}
            </div>
          )}

          <div className='space-y-2 pt-2'>
            <button
              type='submit'
              disabled={saving || !firstName.trim() || !lastName.trim() || !dob}
              className='w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add resident'}
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
