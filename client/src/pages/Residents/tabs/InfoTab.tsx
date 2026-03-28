import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Resident } from '../../../types/resident'
import { archiveResident } from '../../../api/residents'
import { ageFromDob } from '../../../utils/date'
import { useRole } from '../../../utils/role'
import BehaviorsSection from './BehaviorsSection'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex justify-between items-start gap-4 text-sm py-2 border-b border-gray-50 last:border-0'>
      <dt className='text-gray-500 shrink-0'>{label}</dt>
      <dd className='text-gray-900 font-medium text-right'>{value}</dd>
    </div>
  )
}

interface Props {
  resident:  Resident
  onRefresh: () => void
}

export default function InfoTab({ resident, onRefresh }: Props) {
  const navigate                          = useNavigate()
  const { isManagerOrAbove }              = useRole()
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [archiving,      setArchiving]      = useState(false)

  async function handleArchive() {
    setArchiving(true)
    try {
      await archiveResident(resident.id)
      navigate('/residents', { replace: true })
    } catch {
      setArchiving(false)
      setConfirmArchive(false)
    }
  }

  return (
    <div className='space-y-3 p-4'>
      {/* Personal */}
      <div className='bg-white rounded-xl p-4 shadow-sm'>
        <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2'>Personal</h2>
        <dl>
          <Row label='Date of birth' value={`${resident.date_of_birth} · age ${ageFromDob(resident.date_of_birth)}`} />
          {resident.diagnosis && <Row label='Diagnosis' value={resident.diagnosis} />}
          {resident.physician  && <Row label='Physician' value={resident.physician} />}
          {resident.room       && <Row label='Room'      value={resident.room} />}
        </dl>
      </div>

      {/* Primary Contact */}
      {(resident.primary_contact_name ?? resident.primary_contact_phone) && (
        <div className='bg-white rounded-xl p-4 shadow-sm'>
          <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2'>Primary Contact</h2>
          <dl>
            {resident.primary_contact_name     && <Row label='Name'     value={resident.primary_contact_name} />}
            {resident.primary_contact_phone    && <Row label='Phone'    value={resident.primary_contact_phone} />}
            {resident.primary_contact_relation && <Row label='Relation' value={resident.primary_contact_relation} />}
          </dl>
        </div>
      )}

      {/* Notes */}
      {resident.notes && (
        <div className='bg-white rounded-xl p-4 shadow-sm'>
          <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2'>Notes</h2>
          <p className='text-sm text-gray-700 whitespace-pre-wrap'>{resident.notes}</p>
        </div>
      )}

      {/* Manager: Tracked Behaviors */}
      {isManagerOrAbove && (
        <BehaviorsSection residentId={resident.id} />
      )}

      {/* Manager: Archive */}
      {isManagerOrAbove && (
        <div className='pt-2'>
          {!confirmArchive ? (
            <button
              onClick={() => setConfirmArchive(true)}
              className='w-full border border-red-200 text-red-600 rounded-xl py-3 text-sm font-medium min-h-[44px]'
            >
              Archive this resident
            </button>
          ) : (
            <div className='bg-red-50 border border-red-200 rounded-xl p-4 space-y-3'>
              <p className='text-sm text-red-700 font-medium'>
                Archive {resident.first_name} {resident.last_name}?
              </p>
              <p className='text-xs text-red-500'>
                This will hide them from the active residents list.
              </p>
              <div className='flex gap-2'>
                <button
                  onClick={() => setConfirmArchive(false)}
                  className='flex-1 border border-gray-300 bg-white rounded-lg py-2.5 text-sm text-gray-600 min-h-[44px]'
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleArchive()}
                  disabled={archiving}
                  className='flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
                >
                  {archiving ? 'Archiving…' : 'Archive'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
