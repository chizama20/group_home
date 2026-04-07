import { useState, useRef } from 'react'
import { ChevronLeft, X, Plus } from 'lucide-react'
import { createResident, addContact, addGoal, addVitalsConfig } from '../../api/residents'
import { createMedication } from '../../api/medications'
import type { ResidentContact, ResidentGoal, ResidentVitalsConfig } from '../../types/resident'

interface Props {
  homeId: string
  onSuccess: () => void
  onCancel: () => void
}

// ─── Local types ──────────────────────────────────────────────────────────────

interface ContactDraft {
  name: string
  relationship: string
  phone: string
  email: string
  is_emergency_contact: boolean
  notify_on_incident: boolean
}

interface GoalDraft {
  code: string
  label: string
  checked: boolean
  description: string
}

interface VitalDraft {
  enabled: boolean
  meal_timing: string
  target_min: string
  target_max: string
  unit: string
  frequency: string
  label: string
}

interface MedDraft {
  name: string
  dosage: string
  frequency: string
  scheduled_time: string
  instructions: string
  prescriber: string
}

interface WizardData {
  // Step 1
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  room: string
  admit_date: string
  medicaid_id: string
  diagnosis: string
  hab_waiver: boolean
  loa_info: string
  sleep_hours: string
  attends_day_program: boolean
  day_program_days_per_week: string
  // Step 2
  contacts: ContactDraft[]
  // Step 3
  clsGoals: GoalDraft[]
  hasPcGoals: boolean
  pcGoals: GoalDraft[]
  // Step 4
  vitals: Record<string, VitalDraft>
  // Step 5
  medications: MedDraft[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLS_CODES: { code: string; label: string }[] = [
  { code: 'C1',  label: 'Community Integration' },
  { code: 'C2',  label: 'Communication' },
  { code: 'C3',  label: 'Self-Care' },
  { code: 'C4',  label: 'Social Skills' },
  { code: 'C5',  label: 'Health & Safety' },
  { code: 'C6',  label: 'Mobility' },
  { code: 'C7',  label: 'Meal Preparation' },
  { code: 'C8',  label: 'Household Management' },
  { code: 'C9',  label: 'Financial Management' },
  { code: 'C10', label: 'Employment / Day Program' },
  { code: 'C11', label: 'Leisure & Recreation' },
]

const PC_CODES: { code: string; label: string }[] = [
  { code: 'P1', label: 'Bathing' },
  { code: 'P2', label: 'Grooming' },
  { code: 'P3', label: 'Dressing' },
  { code: 'P4', label: 'Toileting' },
  { code: 'P5', label: 'Feeding' },
  { code: 'P6', label: 'Mobility Assistance' },
  { code: 'P7', label: 'Positioning' },
]

const VITAL_KEYS = ['blood_glucose', 'blood_pressure', 'weight', 'temperature', 'o2_sat', 'other'] as const
type VitalKey = typeof VITAL_KEYS[number]

const VITAL_LABELS: Record<VitalKey, string> = {
  blood_glucose:  'Blood Glucose',
  blood_pressure: 'Blood Pressure',
  weight:         'Weight',
  temperature:    'Temperature',
  o2_sat:         'O2 Saturation',
  other:          'Other',
}

function emptyVital(): VitalDraft {
  return { enabled: false, meal_timing: '', target_min: '', target_max: '', unit: '', frequency: '', label: '' }
}

function initialData(): WizardData {
  return {
    first_name: '', last_name: '', date_of_birth: '', gender: '', room: '',
    admit_date: '', medicaid_id: '', diagnosis: '', hab_waiver: false, loa_info: '',
    sleep_hours: '', attends_day_program: false, day_program_days_per_week: '',
    contacts: [],
    clsGoals: CLS_CODES.map(c => ({ ...c, checked: false, description: '' })),
    hasPcGoals: false,
    pcGoals: PC_CODES.map(c => ({ ...c, checked: false, description: '' })),
    vitals: Object.fromEntries(VITAL_KEYS.map(k => [k, emptyVital()])) as Record<string, VitalDraft>,
    medications: [],
  }
}

function emptyContact(): ContactDraft {
  return { name: '', relationship: '', phone: '', email: '', is_emergency_contact: false, notify_on_incident: false }
}

function emptyMed(): MedDraft {
  return { name: '', dosage: '', frequency: '', scheduled_time: '', instructions: '', prescriber: '' }
}

// ─── Style constants ──────────────────────────────────────────────────────────

const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'
const sectionLabel = 'text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3'

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type='button'
      onClick={() => onChange(!value)}
      className='flex items-center justify-between w-full min-h-[44px] py-2'
    >
      <span className='text-sm text-zinc-700 dark:text-zinc-300'>{label}</span>
      <div className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ data, update }: { data: WizardData; update: (patch: Partial<WizardData>) => void }) {
  return (
    <div className='space-y-4'>
      <p className={sectionLabel}>Basic Information</p>
      <div className='space-y-3'>
        <input
          type='text' placeholder='First name *' value={data.first_name}
          onChange={e => update({ first_name: e.target.value })}
          className={inputClass}
        />
        <input
          type='text' placeholder='Last name *' value={data.last_name}
          onChange={e => update({ last_name: e.target.value })}
          className={inputClass}
        />
        <div>
          <label className={labelClass}>Date of birth *</label>
          <input
            type='date' value={data.date_of_birth}
            onChange={e => update({ date_of_birth: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Gender</label>
          <select value={data.gender} onChange={e => update({ gender: e.target.value })} className={inputClass}>
            <option value=''>Select…</option>
            <option value='Male'>Male</option>
            <option value='Female'>Female</option>
            <option value='Non-binary'>Non-binary</option>
            <option value='Prefer not to say'>Prefer not to say</option>
          </select>
        </div>
        <input
          type='text' placeholder='Room' value={data.room}
          onChange={e => update({ room: e.target.value })}
          className={inputClass}
        />
        <div>
          <label className={labelClass}>Admit date</label>
          <input
            type='date' value={data.admit_date}
            onChange={e => update({ admit_date: e.target.value })}
            className={inputClass}
          />
        </div>
        <input
          type='text' placeholder='Medicaid ID' value={data.medicaid_id}
          onChange={e => update({ medicaid_id: e.target.value })}
          className={inputClass}
        />
        <textarea
          placeholder='Diagnosis' rows={2} value={data.diagnosis}
          onChange={e => update({ diagnosis: e.target.value })}
          className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500'
        />

        <div className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3'>
          <Toggle
            value={data.hab_waiver}
            onChange={v => update({ hab_waiver: v })}
            label='HAB Waiver active'
          />
          {data.hab_waiver && (
            <div className='pb-3'>
              <textarea
                placeholder='LOA / Waiver notes' rows={2} value={data.loa_info}
                onChange={e => update({ loa_info: e.target.value })}
                className='w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500'
              />
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Avg. sleep hours per night</label>
          <input
            type='number' min='0' max='24' step='0.5' placeholder='e.g. 7.5' value={data.sleep_hours}
            onChange={e => update({ sleep_hours: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3'>
          <Toggle
            value={data.attends_day_program}
            onChange={v => update({ attends_day_program: v })}
            label='Attends day program'
          />
          {data.attends_day_program && (
            <div className='pb-3'>
              <label className={labelClass}>Days per week</label>
              <input
                type='number' min='1' max='7' placeholder='1–7' value={data.day_program_days_per_week}
                onChange={e => update({ day_program_days_per_week: e.target.value })}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Step2({ data, update }: { data: WizardData; update: (patch: Partial<WizardData>) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<ContactDraft>(emptyContact())

  function patchDraft(patch: Partial<ContactDraft>) {
    setDraft(d => ({ ...d, ...patch }))
  }

  function addContact() {
    if (!draft.name.trim()) return
    update({ contacts: [...data.contacts, { ...draft, name: draft.name.trim() }] })
    setDraft(emptyContact())
    setShowForm(false)
  }

  function removeContact(idx: number) {
    update({ contacts: data.contacts.filter((_, i) => i !== idx) })
  }

  return (
    <div className='space-y-4'>
      <p className='text-sm text-zinc-500 dark:text-zinc-400'>
        Add contacts for this resident — emergency contacts, case managers, physicians.
      </p>

      {data.contacts.length > 0 && (
        <div className='space-y-2'>
          {data.contacts.map((c, i) => (
            <div key={i} className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 flex items-start justify-between gap-2'>
              <div>
                <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{c.name}</p>
                {c.relationship && (
                  <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>{c.relationship}</p>
                )}
                {c.is_emergency_contact && (
                  <span className='mt-1 inline-block bg-red-500/10 text-red-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-md'>
                    Emergency
                  </span>
                )}
              </div>
              <button type='button' onClick={() => removeContact(i)} className='text-zinc-400 hover:text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2'>
                <X className='h-4 w-4' />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3'>
          <input
            type='text' placeholder='Name *' value={draft.name}
            onChange={e => patchDraft({ name: e.target.value })}
            className={inputClass}
          />
          <input
            type='text' placeholder='Relationship' value={draft.relationship}
            onChange={e => patchDraft({ relationship: e.target.value })}
            className={inputClass}
          />
          <input
            type='tel' placeholder='Phone' value={draft.phone}
            onChange={e => patchDraft({ phone: e.target.value })}
            className={inputClass}
          />
          <input
            type='email' placeholder='Email' value={draft.email}
            onChange={e => patchDraft({ email: e.target.value })}
            className={inputClass}
          />
          <Toggle value={draft.is_emergency_contact} onChange={v => patchDraft({ is_emergency_contact: v })} label='Emergency contact' />
          <Toggle value={draft.notify_on_incident} onChange={v => patchDraft({ notify_on_incident: v })} label='Notify on incident' />
          <div className='flex gap-2 pt-1'>
            <button
              type='button'
              onClick={addContact}
              disabled={!draft.name.trim()}
              className='flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              Add
            </button>
            <button
              type='button'
              onClick={() => { setShowForm(false); setDraft(emptyContact()) }}
              className='flex-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl py-2.5 text-sm font-semibold min-h-[44px]'
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type='button'
          onClick={() => setShowForm(true)}
          className='flex items-center gap-2 text-indigo-500 text-sm font-semibold min-h-[44px]'
        >
          <Plus className='h-4 w-4' />
          Add Contact
        </button>
      )}
    </div>
  )
}

function GoalSection({
  title,
  goals,
  onChange,
}: {
  title: string
  goals: GoalDraft[]
  onChange: (updated: GoalDraft[]) => void
}) {
  function toggle(idx: number) {
    const next = goals.map((g, i) => i === idx ? { ...g, checked: !g.checked, description: !g.checked ? g.description : '' } : g)
    onChange(next)
  }
  function setDesc(idx: number, description: string) {
    onChange(goals.map((g, i) => i === idx ? { ...g, description } : g))
  }

  return (
    <div>
      <p className={sectionLabel}>{title}</p>
      <div className='space-y-2'>
        {goals.map((g, i) => (
          <div key={g.code} className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden'>
            <button
              type='button'
              onClick={() => toggle(i)}
              className='flex items-center gap-3 w-full px-4 min-h-[44px] py-3'
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${g.checked ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-300 dark:border-zinc-600'}`}>
                {g.checked && <svg className='w-3 h-3 text-white' fill='none' viewBox='0 0 12 12'><path d='M2 6l3 3 5-5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/></svg>}
              </div>
              <span className='text-sm text-zinc-900 dark:text-white text-left'>
                <span className='font-semibold text-indigo-500 mr-1.5'>{g.code}</span>
                {g.label}
              </span>
            </button>
            {g.checked && (
              <div className='px-4 pb-3'>
                <textarea
                  placeholder='Custom description (optional)' rows={2} value={g.description}
                  onChange={e => setDesc(i, e.target.value)}
                  className='w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500'
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Step3({ data, update }: { data: WizardData; update: (patch: Partial<WizardData>) => void }) {
  return (
    <div className='space-y-6'>
      <GoalSection
        title='Community Living Supports (CLS)'
        goals={data.clsGoals}
        onChange={clsGoals => update({ clsGoals })}
      />

      <div className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3'>
        <Toggle
          value={data.hasPcGoals}
          onChange={v => update({ hasPcGoals: v })}
          label='Resident has Personal Care (PC) goals'
        />
      </div>

      {data.hasPcGoals && (
        <GoalSection
          title='Personal Care (PC)'
          goals={data.pcGoals}
          onChange={pcGoals => update({ pcGoals })}
        />
      )}
    </div>
  )
}

function VitalCard({
  vitalKey,
  vital,
  onChange,
}: {
  vitalKey: VitalKey
  vital: VitalDraft
  onChange: (patch: Partial<VitalDraft>) => void
}) {
  const isOther = vitalKey === 'other'
  const showMealTiming = vitalKey === 'blood_glucose'
  const showUnitSelect = vitalKey === 'weight' || vitalKey === 'temperature'

  return (
    <div className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden'>
      <button
        type='button'
        onClick={() => onChange({ enabled: !vital.enabled })}
        className='flex items-center justify-between w-full px-4 min-h-[44px] py-3'
      >
        <span className='text-sm font-semibold text-zinc-900 dark:text-white'>{VITAL_LABELS[vitalKey]}</span>
        <div className={`relative w-11 h-6 rounded-full transition-colors ${vital.enabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${vital.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      </button>

      {vital.enabled && (
        <div className='px-4 pb-4 space-y-3 border-t border-zinc-100 dark:border-zinc-700 pt-3'>
          {isOther && (
            <input
              type='text' placeholder='Label *' value={vital.label}
              onChange={e => onChange({ label: e.target.value })}
              className={inputClass}
            />
          )}
          {showMealTiming && (
            <div>
              <label className={labelClass}>Meal timing</label>
              <select value={vital.meal_timing} onChange={e => onChange({ meal_timing: e.target.value })} className={inputClass}>
                <option value=''>Select…</option>
                <option value='Pre-meal'>Pre-meal</option>
                <option value='Post-meal'>Post-meal</option>
                <option value='Fasting'>Fasting</option>
                <option value='All'>All</option>
              </select>
            </div>
          )}
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className={labelClass}>
                {vitalKey === 'blood_pressure' ? 'Min systolic' : 'Min'}
              </label>
              <input
                type='number' placeholder='Min' value={vital.target_min}
                onChange={e => onChange({ target_min: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {vitalKey === 'blood_pressure' ? 'Max systolic' : 'Max'}
              </label>
              <input
                type='number' placeholder='Max' value={vital.target_max}
                onChange={e => onChange({ target_max: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          {showUnitSelect ? (
            <div>
              <label className={labelClass}>Unit</label>
              <select value={vital.unit} onChange={e => onChange({ unit: e.target.value })} className={inputClass}>
                {vitalKey === 'weight' && (
                  <>
                    <option value='lbs'>lbs</option>
                    <option value='kg'>kg</option>
                  </>
                )}
                {vitalKey === 'temperature' && (
                  <>
                    <option value='°F'>°F</option>
                    <option value='°C'>°C</option>
                  </>
                )}
              </select>
            </div>
          ) : isOther ? (
            <div>
              <label className={labelClass}>Unit</label>
              <input
                type='text' placeholder='e.g. mg/dL' value={vital.unit}
                onChange={e => onChange({ unit: e.target.value })}
                className={inputClass}
              />
            </div>
          ) : null}
          <div>
            <label className={labelClass}>Frequency</label>
            <input
              type='text' placeholder='e.g. Twice daily' value={vital.frequency}
              onChange={e => onChange({ frequency: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Step4({ data, update }: { data: WizardData; update: (patch: Partial<WizardData>) => void }) {
  function updateVital(key: string, patch: Partial<VitalDraft>) {
    update({ vitals: { ...data.vitals, [key]: { ...data.vitals[key], ...patch } } })
  }

  return (
    <div className='space-y-3'>
      <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-1'>
        Which vitals need to be tracked for this resident?
      </p>
      {VITAL_KEYS.map(k => (
        <VitalCard
          key={k}
          vitalKey={k}
          vital={data.vitals[k]}
          onChange={patch => updateVital(k, patch)}
        />
      ))}
    </div>
  )
}

function Step5({
  data,
  update,
  onSkip,
}: {
  data: WizardData
  update: (patch: Partial<WizardData>) => void
  onSkip: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<MedDraft>(emptyMed())

  function patchDraft(patch: Partial<MedDraft>) {
    setDraft(d => ({ ...d, ...patch }))
  }

  function addMed() {
    if (!draft.name.trim() || !draft.dosage.trim() || !draft.frequency.trim()) return
    update({ medications: [...data.medications, { ...draft }] })
    setDraft(emptyMed())
    setShowForm(false)
  }

  function removeMed(idx: number) {
    update({ medications: data.medications.filter((_, i) => i !== idx) })
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 flex-1 pr-4'>
          Add initial medications — you can skip and add these later from the resident's profile.
        </p>
        <button type='button' onClick={onSkip} className='text-indigo-500 text-sm font-semibold shrink-0 min-h-[44px]'>
          Skip
        </button>
      </div>

      {data.medications.length > 0 && (
        <div className='space-y-2'>
          {data.medications.map((m, i) => (
            <div key={i} className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 flex items-start justify-between gap-2'>
              <div>
                <p className='text-sm font-semibold text-zinc-900 dark:text-white'>{m.name}</p>
                <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>{m.dosage} · {m.frequency}</p>
              </div>
              <button type='button' onClick={() => removeMed(i)} className='text-zinc-400 hover:text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2'>
                <X className='h-4 w-4' />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3'>
          <input
            type='text' placeholder='Medication name *' value={draft.name}
            onChange={e => patchDraft({ name: e.target.value })}
            className={inputClass}
          />
          <input
            type='text' placeholder='Dosage *' value={draft.dosage}
            onChange={e => patchDraft({ dosage: e.target.value })}
            className={inputClass}
          />
          <input
            type='text' placeholder='Frequency *' value={draft.frequency}
            onChange={e => patchDraft({ frequency: e.target.value })}
            className={inputClass}
          />
          <div>
            <label className={labelClass}>Scheduled time</label>
            <input
              type='time' value={draft.scheduled_time}
              onChange={e => patchDraft({ scheduled_time: e.target.value })}
              className={inputClass}
            />
          </div>
          <input
            type='text' placeholder='Instructions' value={draft.instructions}
            onChange={e => patchDraft({ instructions: e.target.value })}
            className={inputClass}
          />
          <input
            type='text' placeholder='Prescriber' value={draft.prescriber}
            onChange={e => patchDraft({ prescriber: e.target.value })}
            className={inputClass}
          />
          <div className='flex gap-2 pt-1'>
            <button
              type='button'
              onClick={addMed}
              disabled={!draft.name.trim() || !draft.dosage.trim() || !draft.frequency.trim()}
              className='flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              Add
            </button>
            <button
              type='button'
              onClick={() => { setShowForm(false); setDraft(emptyMed()) }}
              className='flex-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl py-2.5 text-sm font-semibold min-h-[44px]'
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type='button'
          onClick={() => setShowForm(true)}
          className='flex items-center gap-2 text-indigo-500 text-sm font-semibold min-h-[44px]'
        >
          <Plus className='h-4 w-4' />
          Add Medication
        </button>
      )}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex justify-between gap-4 py-1.5'>
      <span className='text-xs text-zinc-500 dark:text-zinc-400 shrink-0'>{label}</span>
      <span className='text-xs font-medium text-zinc-900 dark:text-white text-right'>{value || '—'}</span>
    </div>
  )
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden'>
      <button
        type='button'
        onClick={() => setOpen(o => !o)}
        className='flex items-center justify-between w-full px-4 min-h-[44px] py-3'
      >
        <span className='text-sm font-semibold text-zinc-900 dark:text-white'>{title}</span>
        <ChevronLeft className={`h-4 w-4 text-zinc-400 transition-transform ${open ? '-rotate-90' : 'rotate-0'}`} />
      </button>
      {open && <div className='px-4 pb-4 border-t border-zinc-100 dark:border-zinc-700 pt-2'>{children}</div>}
    </div>
  )
}

function Step6({ data }: { data: WizardData }) {
  const trackedVitals = VITAL_KEYS.filter(k => data.vitals[k].enabled)
  const clsChecked = data.clsGoals.filter(g => g.checked)
  const pcChecked = data.pcGoals.filter(g => g.checked)

  return (
    <div className='space-y-3'>
      <p className={sectionLabel}>Review & Confirm</p>

      <ReviewSection title='Basic Info'>
        <ReviewRow label='Name' value={`${data.first_name} ${data.last_name}`.trim()} />
        <ReviewRow label='Date of birth' value={data.date_of_birth} />
        <ReviewRow label='Gender' value={data.gender} />
        <ReviewRow label='Room' value={data.room} />
        <ReviewRow label='Diagnosis' value={data.diagnosis} />
      </ReviewSection>

      <ReviewSection title={`Contacts (${data.contacts.length})`}>
        {data.contacts.length === 0 ? (
          <p className='text-xs text-zinc-400 py-1'>None added</p>
        ) : (
          data.contacts.map((c, i) => (
            <p key={i} className='text-xs text-zinc-900 dark:text-white py-1'>
              {c.name}{c.relationship ? ` · ${c.relationship}` : ''}
            </p>
          ))
        )}
      </ReviewSection>

      <ReviewSection title='Goals'>
        <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-0.5'>CLS</p>
        {clsChecked.length === 0 ? (
          <p className='text-xs text-zinc-400 py-1'>None</p>
        ) : (
          <p className='text-xs text-zinc-900 dark:text-white py-1'>
            {clsChecked.map(g => g.code).join(', ')}
          </p>
        )}
        {data.hasPcGoals && (
          <>
            <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-2 mb-0.5'>PC</p>
            {pcChecked.length === 0 ? (
              <p className='text-xs text-zinc-400 py-1'>None</p>
            ) : (
              <p className='text-xs text-zinc-900 dark:text-white py-1'>
                {pcChecked.map(g => g.code).join(', ')}
              </p>
            )}
          </>
        )}
      </ReviewSection>

      <ReviewSection title='Vitals'>
        {trackedVitals.length === 0 ? (
          <p className='text-xs text-zinc-400 py-1'>None selected</p>
        ) : (
          trackedVitals.map(k => (
            <p key={k} className='text-xs text-zinc-900 dark:text-white py-1'>
              {VITAL_LABELS[k]}{data.vitals[k].label ? ` — ${data.vitals[k].label}` : ''}
            </p>
          ))
        )}
      </ReviewSection>

      <ReviewSection title={`Medications (${data.medications.length})`}>
        {data.medications.length === 0 ? (
          <p className='text-xs text-zinc-400 py-1'>None added</p>
        ) : (
          data.medications.map((m, i) => (
            <p key={i} className='text-xs text-zinc-900 dark:text-white py-1'>{m.name}</p>
          ))
        )}
      </ReviewSection>
    </div>
  )
}

// ─── Step labels ──────────────────────────────────────────────────────────────

const STEP_LABELS = ['Basic Info', 'Contacts', 'Goals', 'Vitals', 'Medications', 'Review']

// ─── Auto-unit helpers ────────────────────────────────────────────────────────

function resolvedUnit(key: VitalKey, vital: VitalDraft): string {
  if (key === 'blood_pressure') return 'mmHg'
  if (key === 'o2_sat')         return '%'
  if (key === 'blood_glucose')  return 'mg/dL'
  return vital.unit
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function ResidentForm({ homeId, onSuccess, onCancel }: Props) {
  const [step, setStep] = useState(1)
  const dataRef = useRef<WizardData>(initialData())
  const [, forceRender] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(patch: Partial<WizardData>) {
    dataRef.current = { ...dataRef.current, ...patch }
    forceRender(n => n + 1)
  }

  const data = dataRef.current

  const step1Valid = data.first_name.trim() !== '' && data.last_name.trim() !== '' && data.date_of_birth !== ''

  function goNext() {
    setStep(s => Math.min(s + 1, 6))
  }

  function goBack() {
    if (step === 1) { onCancel(); return }
    setStep(s => Math.max(s - 1, 1))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        first_name:                data.first_name.trim(),
        last_name:                 data.last_name.trim(),
        date_of_birth:             data.date_of_birth,
        gender:                    data.gender        || null,
        room:                      data.room.trim()   || null,
        admit_date:                data.admit_date    || null,
        medicaid_id:               data.medicaid_id.trim() || null,
        diagnosis:                 data.diagnosis.trim()   || null,
        hab_waiver:                data.hab_waiver,
        loa_info:                  data.hab_waiver ? data.loa_info.trim() || null : null,
        sleep_hours:               data.sleep_hours ? parseFloat(data.sleep_hours) : null,
        attends_day_program:       data.attends_day_program,
        day_program_days_per_week: data.attends_day_program && data.day_program_days_per_week
          ? parseInt(data.day_program_days_per_week, 10)
          : null,
      }

      const res = await createResident(homeId, payload)
      const newId = res.data.data?.id
      if (!newId) throw new Error('No resident ID returned')

      const contactPromises = data.contacts.map(c =>
        addContact(newId, {
          name:                 c.name,
          relationship:         c.relationship || undefined,
          phone:                c.phone        || undefined,
          email:                c.email        || undefined,
          is_emergency_contact: c.is_emergency_contact,
          notify_on_incident:   c.notify_on_incident,
        } as Omit<ResidentContact, 'id' | 'resident_id' | 'is_active' | 'created_at' | 'updated_at'>)
      )

      const goalPromises: Promise<unknown>[] = []
      data.clsGoals.filter(g => g.checked).forEach(g => {
        goalPromises.push(
          addGoal(newId, {
            goal_type:   'cls',
            code:        g.code,
            description: g.description.trim() || undefined,
          } as Pick<ResidentGoal, 'goal_type' | 'code' | 'description'>)
        )
      })
      if (data.hasPcGoals) {
        data.pcGoals.filter(g => g.checked).forEach(g => {
          goalPromises.push(
            addGoal(newId, {
              goal_type:   'pc',
              code:        g.code,
              description: g.description.trim() || undefined,
            } as Pick<ResidentGoal, 'goal_type' | 'code' | 'description'>)
          )
        })
      }

      const vitalsPromises = VITAL_KEYS.filter(k => data.vitals[k].enabled).map(k => {
        const v = data.vitals[k]
        const unit = resolvedUnit(k, v)
        return addVitalsConfig(newId, {
          vital_type:  k,
          label:       v.label   || undefined,
          frequency:   v.frequency || undefined,
          meal_timing: v.meal_timing || undefined,
          target_min:  v.target_min ? parseFloat(v.target_min) : undefined,
          target_max:  v.target_max ? parseFloat(v.target_max) : undefined,
          unit:        unit || undefined,
        } as Omit<ResidentVitalsConfig, 'id' | 'resident_id' | 'is_active' | 'created_at' | 'updated_at'>)
      })

      const medPromises = data.medications.map(m =>
        createMedication(newId, {
          name:           m.name,
          dosage:         m.dosage,
          frequency:      m.frequency,
          scheduled_time: m.scheduled_time || undefined,
          instructions:   m.instructions   || undefined,
          prescriber:     m.prescriber     || undefined,
        })
      )

      await Promise.all([...contactPromises, ...goalPromises, ...vitalsPromises, ...medPromises])
      onSuccess()
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const nextDisabled = step === 1 && !step1Valid

  return (
    <>
      <div className='fixed inset-0 bg-black/60 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl z-50 max-h-[90vh] flex flex-col'>

        {/* Progress bar */}
        <div className='h-1 bg-zinc-100 dark:bg-zinc-800 rounded-t-3xl overflow-hidden shrink-0'>
          <div
            className='h-full bg-indigo-600 transition-all duration-300'
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className='flex items-center justify-between px-4 pt-4 pb-3 shrink-0'>
          <button
            type='button'
            onClick={goBack}
            className='w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          >
            {step === 1 ? <X className='h-4 w-4' /> : <ChevronLeft className='h-4 w-4' />}
          </button>
          <div className='text-center'>
            <p className='text-[15px] font-semibold text-zinc-900 dark:text-white'>{STEP_LABELS[step - 1]}</p>
            <p className='text-xs text-zinc-400 dark:text-zinc-500'>Step {step} of 6</p>
          </div>
          <div className='w-9' />
        </div>

        {/* Drag handle */}
        <div className='w-9 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-1 shrink-0' />

        {/* Scrollable content */}
        <div className='flex-1 overflow-y-auto px-4 pb-6'>
          {step === 1 && <Step1 data={data} update={update} />}
          {step === 2 && <Step2 data={data} update={update} />}
          {step === 3 && <Step3 data={data} update={update} />}
          {step === 4 && <Step4 data={data} update={update} />}
          {step === 5 && <Step5 data={data} update={update} onSkip={goNext} />}
          {step === 6 && <Step6 data={data} />}

          {error && (
            <div className='mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='px-4 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0'>
          {step < 6 ? (
            <button
              type='button'
              onClick={goNext}
              disabled={nextDisabled}
              className='w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              Next
            </button>
          ) : (
            <button
              type='button'
              onClick={() => { void handleSubmit() }}
              disabled={submitting}
              className='w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              {submitting ? 'Creating…' : 'Create Resident'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
