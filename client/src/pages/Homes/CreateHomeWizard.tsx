import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, Check, Building2, MapPin, Clock, Users } from 'lucide-react'
import { createHome } from '../../api/homes'
import { getOrgStaff, type OrgStaffMember } from '../../api/orgs'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'

type Step = 1 | 2 | 3 | 4 | 5

interface ShiftConfig {
  day: { start: string; end: string }
  evening: { start: string; end: string }
  night: { start: string; end: string }
}

const DEFAULT_SHIFTS: ShiftConfig = {
  day: { start: '07:00', end: '15:00' },
  evening: { start: '15:00', end: '23:00' },
  night: { start: '23:00', end: '07:00' },
}

const STEP_LABELS = [
  'Facility Details',
  'Address & Contact',
  'Shift Config',
  'Staff Assignment',
  'Review & Create',
]

export default function CreateHomeWizard() {
  const navigate = useNavigate()
  const { org } = useAuth()
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Facility Details
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')

  // Step 2: Address & Contact
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [phone, setPhone] = useState('')

  // Step 3: Shift Config
  const [shifts, setShifts] = useState<ShiftConfig>(DEFAULT_SHIFTS)

  // Step 4: Staff Assignment
  const [staffList, setStaffList] = useState<OrgStaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [loadingStaff, setLoadingStaff] = useState(false)

  useEffect(() => {
    if (step === 4 && staffList.length === 0) {
      setLoadingStaff(true)
      getOrgStaff(org?.id ?? '')
        .then(res => setStaffList(res.data.data ?? []))
        .catch(() => {})
        .finally(() => setLoadingStaff(false))
    }
  }, [step, org?.id, staffList.length])

  function canProceed(): boolean {
    switch (step) {
      case 1: return name.trim().length > 0
      case 2: return true // Address is optional
      case 3: return true // Use defaults
      case 4: return true // Staff assignment optional
      case 5: return true
      default: return false
    }
  }

  function handleBack() {
    if (step > 1) setStep((step - 1) as Step)
    else navigate('/homes')
  }

  function handleNext() {
    if (step < 5) setStep((step + 1) as Step)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const fullAddress = [address, city, state, zip].filter(Boolean).join(', ')
      await createHome({ name: name.trim(), address: fullAddress || undefined })
      // TODO: Assign selected staff to home after creation
      navigate('/homes')
    } catch {
      setError('Failed to create home. Please try again.')
      setSubmitting(false)
    }
  }

  function toggleStaff(id: string) {
    setSelectedStaff(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black pb-8'>
      <div className='max-w-2xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between px-4 pt-5 pb-3'>
          <button onClick={handleBack} className='flex items-center gap-1 min-h-[44px]'>
            <ChevronLeft className='h-5 w-5 text-zinc-500' />
            <span className='text-sm text-zinc-500 dark:text-zinc-400 font-medium'>
              {step === 1 ? 'Homes' : 'Back'}
            </span>
          </button>
          <button onClick={() => navigate('/homes')} className='p-2 text-zinc-400 hover:text-zinc-600'>
            <X className='h-5 w-5' />
          </button>
        </div>

        <h1 className='text-xl font-bold text-zinc-900 dark:text-white px-4'>
          Create New Home
        </h1>

        {/* Step indicator */}
        <div className='px-4 mt-4'>
          <div className='flex items-center justify-between mb-2'>
            {STEP_LABELS.map((label, i) => (
              <div key={i} className='flex flex-col items-center flex-1'>
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-1',
                  i + 1 < step ? 'bg-emerald-500 text-white' :
                  i + 1 === step ? 'bg-primary text-white' :
                  'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                )}>
                  {i + 1 < step ? <Check className='w-4 h-4' /> : i + 1}
                </div>
                <span className={cn(
                  'text-[10px] text-center hidden sm:block',
                  i + 1 === step ? 'text-primary dark:text-primary font-medium' : 'text-zinc-400'
                )}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className='h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden'>
            <div
              className='h-full bg-primary transition-all duration-300'
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className='px-4 mt-6'>
          {step === 1 && (
            <div className='space-y-4'>
              <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center'>
                    <Building2 className='w-5 h-5' />
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>Facility Details</p>
                    <p className='text-xs text-zinc-500'>Basic information about the home</p>
                  </div>
                </div>

                <label className='block mb-4'>
                  <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>Home Name *</span>
                  <input
                    type='text'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder='e.g., Sunrise Care Home'
                    className='mt-1 w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400'
                  />
                </label>

                <label className='block'>
                  <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>Capacity (beds)</span>
                  <input
                    type='number'
                    value={capacity}
                    onChange={e => setCapacity(e.target.value)}
                    placeholder='e.g., 6'
                    className='mt-1 w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400'
                  />
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className='space-y-4'>
              <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center'>
                    <MapPin className='w-5 h-5' />
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>Address & Contact</p>
                    <p className='text-xs text-zinc-500'>Location and contact details</p>
                  </div>
                </div>

                <label className='block mb-3'>
                  <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>Street Address</span>
                  <input
                    type='text'
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder='123 Main St'
                    className='mt-1 w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400'
                  />
                </label>

                <div className='grid grid-cols-2 gap-3 mb-3'>
                  <label className='block'>
                    <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>City</span>
                    <input
                      type='text'
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className='mt-1 w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white'
                    />
                  </label>
                  <label className='block'>
                    <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>State</span>
                    <input
                      type='text'
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className='mt-1 w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white'
                    />
                  </label>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <label className='block'>
                    <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>ZIP Code</span>
                    <input
                      type='text'
                      value={zip}
                      onChange={e => setZip(e.target.value)}
                      className='mt-1 w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white'
                    />
                  </label>
                  <label className='block'>
                    <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>Phone</span>
                    <input
                      type='tel'
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder='(555) 123-4567'
                      className='mt-1 w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400'
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className='space-y-4'>
              <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center'>
                    <Clock className='w-5 h-5' />
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>Shift Configuration</p>
                    <p className='text-xs text-zinc-500'>Define shift times (can be changed later)</p>
                  </div>
                </div>

                {(['day', 'evening', 'night'] as const).map(shift => (
                  <div key={shift} className='flex items-center gap-3 py-3 border-t border-zinc-100 dark:border-zinc-800 first:border-t-0'>
                    <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300 w-20 capitalize'>{shift}</span>
                    <input
                      type='time'
                      value={shifts[shift].start}
                      onChange={e => setShifts(s => ({ ...s, [shift]: { ...s[shift], start: e.target.value } }))}
                      className='px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white'
                    />
                    <span className='text-zinc-400'>to</span>
                    <input
                      type='time'
                      value={shifts[shift].end}
                      onChange={e => setShifts(s => ({ ...s, [shift]: { ...s[shift], end: e.target.value } }))}
                      className='px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white'
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className='space-y-4'>
              <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-10 h-10 rounded-xl bg-violet-500/15 text-violet-500 flex items-center justify-center'>
                    <Users className='w-5 h-5' />
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>Staff Assignment</p>
                    <p className='text-xs text-zinc-500'>Select staff to assign to this home</p>
                  </div>
                </div>

                {loadingStaff ? (
                  <div className='flex justify-center py-8'>
                    <div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' />
                  </div>
                ) : staffList.length === 0 ? (
                  <p className='text-sm text-zinc-500 dark:text-zinc-400 text-center py-4'>
                    No staff available. You can assign staff after creating the home.
                  </p>
                ) : (
                  <div className='space-y-2 max-h-64 overflow-y-auto'>
                    {staffList.filter(s => s.role !== 'admin').map(staff => (
                      <label
                        key={staff.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors',
                          selectedStaff.includes(staff.id)
                            ? 'bg-primary dark:bg-primary/10 border border-primary dark:border-primary/30'
                            : 'bg-zinc-50 dark:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                        )}
                      >
                        <input
                          type='checkbox'
                          checked={selectedStaff.includes(staff.id)}
                          onChange={() => toggleStaff(staff.id)}
                          className='sr-only'
                        />
                        <div className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center',
                          selectedStaff.includes(staff.id)
                            ? 'bg-primary border-primary'
                            : 'border-zinc-300 dark:border-zinc-600'
                        )}>
                          {selectedStaff.includes(staff.id) && <Check className='w-3 h-3 text-white' />}
                        </div>
                        <div className='flex-1'>
                          <p className='text-sm font-medium text-zinc-900 dark:text-white'>
                            {staff.first_name} {staff.last_name}
                          </p>
                          <p className='text-xs text-zinc-500'>{staff.email}</p>
                        </div>
                        <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'>
                          {staff.role}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className='space-y-4'>
              <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4'>
                <p className='text-sm font-semibold text-zinc-900 dark:text-white mb-4'>Review & Create</p>

                <div className='space-y-3'>
                  <div className='flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800'>
                    <span className='text-sm text-zinc-500'>Home Name</span>
                    <span className='text-sm font-medium text-zinc-900 dark:text-white'>{name}</span>
                  </div>
                  {capacity && (
                    <div className='flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800'>
                      <span className='text-sm text-zinc-500'>Capacity</span>
                      <span className='text-sm font-medium text-zinc-900 dark:text-white'>{capacity} beds</span>
                    </div>
                  )}
                  {(address || city) && (
                    <div className='flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800'>
                      <span className='text-sm text-zinc-500'>Address</span>
                      <span className='text-sm font-medium text-zinc-900 dark:text-white text-right'>
                        {[address, city, state, zip].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {selectedStaff.length > 0 && (
                    <div className='flex justify-between py-2'>
                      <span className='text-sm text-zinc-500'>Staff to Assign</span>
                      <span className='text-sm font-medium text-zinc-900 dark:text-white'>{selectedStaff.length} members</span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className='bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3'>
                  <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className='px-4 mt-6 flex gap-3'>
          <button
            onClick={handleBack}
            className='flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 py-3 rounded-xl text-sm font-semibold min-h-[48px]'
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 5 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className='flex-1 bg-primary text-white py-3 rounded-xl text-sm font-semibold min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2'
            >
              Next
              <ChevronRight className='w-4 h-4' />
            </button>
          ) : (
            <button
              onClick={() => { void handleSubmit() }}
              disabled={submitting || !canProceed()}
              className='flex-1 bg-primary text-white py-3 rounded-xl text-sm font-semibold min-h-[48px] disabled:opacity-50'
            >
              {submitting ? 'Creating...' : 'Create Home'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
