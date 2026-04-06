import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Resident } from '../../../types/resident'
import { archiveResident } from '../../../api/residents'
import { ageFromDob } from '../../../utils/date'
import { useRole } from '../../../utils/role'
import BehaviorsSection from './BehaviorsSection'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex justify-between items-start gap-4 text-sm py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0'>
      <dt className='text-zinc-500 dark:text-zinc-400 shrink-0'>{label}</dt>
      <dd className='text-zinc-900 dark:text-white font-medium text-right'>{value}</dd>
    </div>
  )
}

interface Props {
  resident:  Resident
  onRefresh: () => void
}

export default function InfoTab({ resident }: Props) {
  const navigate                            = useNavigate()
  const { isManagerOrAbove, isOrgAdmin }    = useRole()
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
      <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4'>
        <h2 className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2'>
          Personal
        </h2>
        <dl>
          <Row label='Date of birth' value={`${resident.date_of_birth} · age ${ageFromDob(resident.date_of_birth)}`} />
          {resident.diagnosis && <Row label='Diagnosis' value={resident.diagnosis} />}
          {resident.physician  && <Row label='Physician' value={resident.physician} />}
          {resident.room       && <Row label='Room'      value={resident.room} />}
        </dl>
      </div>

      {/* Primary Contact */}
      {(resident.primary_contact_name ?? resident.primary_contact_phone) && (
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4'>
          <h2 className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2'>
            Primary Contact
          </h2>
          <dl>
            {resident.primary_contact_name     && <Row label='Name'     value={resident.primary_contact_name} />}
            {resident.primary_contact_phone    && <Row label='Phone'    value={resident.primary_contact_phone} />}
            {resident.primary_contact_relation && <Row label='Relation' value={resident.primary_contact_relation} />}
          </dl>
        </div>
      )}

      {/* Notes */}
      {resident.notes && (
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4'>
          <h2 className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2'>
            Notes
          </h2>
          <p className='text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap'>{resident.notes}</p>
        </div>
      )}

      {/* Manager: Tracked Behaviors */}
      {isManagerOrAbove && (
        <BehaviorsSection residentId={resident.id} />
      )}

      {/* Org admin: Archive */}
      {isOrgAdmin && (
        <div className='pt-2'>
          {!confirmArchive ? (
            <button
              onClick={() => setConfirmArchive(true)}
              className='w-full border border-red-200 dark:border-red-900/40 text-red-500 rounded-xl py-3 text-sm font-medium min-h-[44px]'
            >
              Archive this resident
            </button>
          ) : (
            <div className='bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3'>
              <p className='text-sm text-red-400 font-medium'>
                Archive {resident.first_name} {resident.last_name}?
              </p>
              <p className='text-xs text-red-400/70'>
                This will hide them from the active residents list.
              </p>
              <div className='flex gap-2'>
                <button
                  onClick={() => setConfirmArchive(false)}
                  className='flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl py-2.5 text-sm min-h-[44px]'
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleArchive()}
                  disabled={archiving}
                  className='flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
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
