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

  return (
    <>
      <div className='fixed inset-0 bg-black/40 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[92vh] flex flex-col'>
        <div className='w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 shrink-0' />

        <div className='px-4 pt-3 pb-2 border-b border-gray-100 shrink-0'>
          <h2 className='text-base font-semibold text-gray-900'>
            {isEdit ? 'Edit resident' : 'Add resident'}
          </h2>
        </div>

        <form
          onSubmit={e => { void handleSubmit(e) }}
          className='overflow-y-auto flex-1 px-4 py-4 space-y-4 pb-8'
        >
          {/* Required fields */}
          <div>
            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Required</p>
            <div className='space-y-3'>
              <input
                type='text' placeholder='First name' required value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <input
                type='text' placeholder='Last name' required value={lastName}
                onChange={e => setLastName(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Date of birth</label>
                <input
                  type='date' required value={dob}
                  onChange={e => setDob(e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
          </div>

          {/* Optional fields */}
          <div>
            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Optional</p>
            <div className='space-y-3'>
              <input
                type='text' placeholder='Room number' value={room}
                onChange={e => setRoom(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <textarea
                placeholder='Diagnosis' rows={2} value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <input
                type='text' placeholder='Physician name' value={physician}
                onChange={e => setPhysician(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>

          {/* Primary contact */}
          <div>
            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Primary Contact</p>
            <div className='space-y-3'>
              <input
                type='text' placeholder='Contact name' value={contactName}
                onChange={e => setContactName(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <input
                type='tel' placeholder='Contact phone' value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <input
                type='text' placeholder='Relationship (e.g. daughter)' value={contactRel}
                onChange={e => setContactRel(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>

          {/* Notes */}
          <textarea
            placeholder='General notes' rows={3} value={notes}
            onChange={e => setNotes(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
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
              disabled={saving || !firstName.trim() || !lastName.trim() || !dob}
              className='flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add resident'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
