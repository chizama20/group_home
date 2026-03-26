import type { Resident } from '../../../types/resident'
import { ageFromDob } from '../../../utils/date'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex justify-between items-start gap-4 text-sm py-2 border-b border-gray-50 last:border-0'>
      <dt className='text-gray-500 shrink-0'>{label}</dt>
      <dd className='text-gray-900 font-medium text-right'>{value}</dd>
    </div>
  )
}

export default function InfoTab({ resident }: { resident: Resident }) {
  return (
    <div className='space-y-3 p-4'>
      <div className='bg-white rounded-xl p-4 shadow-sm'>
        <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2'>Personal</h2>
        <dl>
          <Row label='Date of birth' value={`${resident.date_of_birth} · age ${ageFromDob(resident.date_of_birth)}`} />
          {resident.diagnosis && <Row label='Diagnosis' value={resident.diagnosis} />}
          {resident.physician  && <Row label='Physician' value={resident.physician} />}
          {resident.room       && <Row label='Room'      value={resident.room} />}
        </dl>
      </div>

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

      {resident.notes && (
        <div className='bg-white rounded-xl p-4 shadow-sm'>
          <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2'>Notes</h2>
          <p className='text-sm text-gray-700 whitespace-pre-wrap'>{resident.notes}</p>
        </div>
      )}
    </div>
  )
}
