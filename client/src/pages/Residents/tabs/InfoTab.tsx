import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Resident, ResidentContact, ResidentGoal, ResidentVitalsConfig } from '../../../types/resident'
import { dischargeResident, getContacts, getGoals, getVitalsConfig } from '../../../api/residents'
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

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4'>
      <h2 className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3'>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div className='flex justify-center py-4'>
      <div className='w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
    </div>
  )
}

// Goal code label maps
const CLS_LABELS: Record<string, string> = {
  C1:  'Community Integration',
  C2:  'Communication',
  C3:  'Self-Care',
  C4:  'Social Skills',
  C5:  'Health & Safety',
  C6:  'Mobility',
  C7:  'Meal Preparation',
  C8:  'Household Management',
  C9:  'Financial Management',
  C10: 'Employment / Day Program',
  C11: 'Leisure & Recreation',
}

const PC_LABELS: Record<string, string> = {
  P1: 'Bathing',
  P2: 'Grooming',
  P3: 'Dressing',
  P4: 'Toileting',
  P5: 'Feeding',
  P6: 'Mobility Assistance',
  P7: 'Positioning',
}

// Vital type display label
const VITAL_TYPE_LABELS: Record<string, string> = {
  blood_glucose:   'Blood Glucose',
  blood_pressure:  'Blood Pressure',
  weight:          'Weight',
  temperature:     'Temperature',
  o2_sat:          'O₂ Saturation',
  other:           'Other',
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

  // Contacts
  const [contacts,        setContacts]        = useState<ResidentContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(true)

  // Goals
  const [goals,        setGoals]        = useState<ResidentGoal[]>([])
  const [goalsLoading, setGoalsLoading] = useState(true)

  // Vitals config
  const [vitalsConfig,   setVitalsConfig]   = useState<ResidentVitalsConfig[]>([])
  const [vitalsLoading,  setVitalsLoading]  = useState(true)

  useEffect(() => {
    getContacts(resident.id)
      .then(res => setContacts(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setContactsLoading(false))
  }, [resident.id])

  useEffect(() => {
    getGoals(resident.id)
      .then(res => setGoals(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setGoalsLoading(false))
  }, [resident.id])

  useEffect(() => {
    getVitalsConfig(resident.id)
      .then(res => setVitalsConfig(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setVitalsLoading(false))
  }, [resident.id])

  async function handleArchive() {
    setArchiving(true)
    try {
      await dischargeResident(resident.id)
      navigate('/residents', { replace: true })
    } catch {
      setArchiving(false)
      setConfirmArchive(false)
    }
  }

  const clsGoals = goals.filter(g => g.goal_type === 'cls')
  const pcGoals  = goals.filter(g => g.goal_type === 'pc')

  return (
    <div className='space-y-3 p-4'>

      {/* Personal */}
      <SectionCard title='Personal'>
        <dl>
          <Row label='Date of birth' value={`${resident.date_of_birth} · age ${ageFromDob(resident.date_of_birth)}`} />
          {resident.diagnosis && <Row label='Diagnosis' value={resident.diagnosis} />}
          {resident.physician  && <Row label='Physician' value={resident.physician} />}
          {resident.room       && <Row label='Room'      value={resident.room} />}
        </dl>
      </SectionCard>

      {/* Contacts */}
      <SectionCard title='Contacts'>
        {contactsLoading ? (
          <Spinner />
        ) : contacts.length === 0 ? (
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No contacts added.</p>
        ) : (
          <ul className='space-y-3'>
            {contacts.map(c => (
              <li key={c.id} className='border-b border-zinc-100 dark:border-zinc-800 last:border-0 pb-3 last:pb-0'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='text-sm font-medium text-zinc-900 dark:text-white'>{c.name}</span>
                  {c.relationship && (
                    <span className='text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full'>
                      {c.relationship}
                    </span>
                  )}
                  {c.is_emergency_contact && (
                    <span className='text-[11px] font-semibold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full'>
                      Emergency Contact
                    </span>
                  )}
                  {c.notify_on_incident && (
                    <span className='text-[11px] font-semibold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full'>
                      Notify on Incident
                    </span>
                  )}
                </div>
                {c.phone && (
                  <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>{c.phone}</p>
                )}
                {c.email && (
                  <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>{c.email}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Goal Codes */}
      <SectionCard title='Goal Codes'>
        {goalsLoading ? (
          <Spinner />
        ) : goals.length === 0 ? (
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No goal codes configured.</p>
        ) : (
          <div className='space-y-4'>
            {clsGoals.length > 0 && (
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2'>CLS</p>
                <ul className='space-y-1.5'>
                  {clsGoals.map(g => (
                    <li key={g.id} className='flex items-center gap-2'>
                      <span className='text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full shrink-0'>
                        {g.code}
                      </span>
                      <span className='text-sm text-zinc-700 dark:text-zinc-300'>
                        {g.description || CLS_LABELS[g.code] || g.code}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pcGoals.length > 0 && (
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2'>PC</p>
                <ul className='space-y-1.5'>
                  {pcGoals.map(g => (
                    <li key={g.id} className='flex items-center gap-2'>
                      <span className='text-[11px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full shrink-0'>
                        {g.code}
                      </span>
                      <span className='text-sm text-zinc-700 dark:text-zinc-300'>
                        {g.description || PC_LABELS[g.code] || g.code}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Vitals Tracking */}
      <SectionCard title='Vitals Tracking'>
        {vitalsLoading ? (
          <Spinner />
        ) : vitalsConfig.length === 0 ? (
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No vitals configured.</p>
        ) : (
          <ul className='space-y-3'>
            {vitalsConfig.map(v => {
              const typeLabel = v.vital_type === 'other' && v.label
                ? v.label
                : VITAL_TYPE_LABELS[v.vital_type] ?? v.vital_type
              const hasRange = v.target_min != null || v.target_max != null
              const rangeText = hasRange
                ? `Target: ${v.target_min ?? '–'}–${v.target_max ?? '–'}${v.unit ? ` ${v.unit}` : ''}`
                : null
              return (
                <li key={v.id} className='border-b border-zinc-100 dark:border-zinc-800 last:border-0 pb-3 last:pb-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='text-sm font-medium text-zinc-900 dark:text-white'>{typeLabel}</span>
                    {v.vital_type === 'blood_glucose' && v.meal_timing && (
                      <span className='text-[11px] font-semibold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full'>
                        {v.meal_timing}
                      </span>
                    )}
                  </div>
                  {v.frequency && (
                    <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>{v.frequency}</p>
                  )}
                  {rangeText && (
                    <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>{rangeText}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      {/* Primary Contact (legacy — kept for backwards compat) */}
      {(resident.primary_contact_name ?? resident.primary_contact_phone) && (
        <SectionCard title='Primary Contact'>
          <dl>
            {resident.primary_contact_name     && <Row label='Name'     value={resident.primary_contact_name} />}
            {resident.primary_contact_phone    && <Row label='Phone'    value={resident.primary_contact_phone} />}
            {resident.primary_contact_relation && <Row label='Relation' value={resident.primary_contact_relation} />}
          </dl>
        </SectionCard>
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

      {/* Org admin: Discharge */}
      {isOrgAdmin && (
        <div className='pt-2'>
          {!confirmArchive ? (
            <button
              onClick={() => setConfirmArchive(true)}
              className='w-full border border-red-200 dark:border-red-900/40 text-red-500 rounded-xl py-3 text-sm font-medium min-h-[44px]'
            >
              Discharge resident
            </button>
          ) : (
            <div className='bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3'>
              <p className='text-sm text-red-400 font-medium'>
                Discharge {resident.first_name} {resident.last_name}?
              </p>
              <p className='text-xs text-red-400/70'>
                This will mark them as discharged and remove them from the active residents list.
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
                  {archiving ? 'Discharging…' : 'Discharge'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
