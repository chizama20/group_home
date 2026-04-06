import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Mail } from 'lucide-react'
import { inviteUser } from '../api/orgs'
import { useHome } from '../context/HomeContext'
import { addStaff, type Home } from '../api/homes'
import type { UserRole } from '../types/auth'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

const STEPS = ['Personal Info', 'Role & Access', 'Review & Send'] as const
type Step = 0 | 1 | 2

const ROLES: { value: 'employee' | 'manager'; label: string }[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
]

export default function InviteStaffWizard({ onSuccess, onCancel }: Props) {
  const { homes } = useHome()
  const [step, setStep] = useState<Step>(0)

  // Step 1: Personal Info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  // Step 2: Role & Access
  const [role, setRole] = useState<'employee' | 'manager'>('employee')
  const [selectedHomes, setSelectedHomes] = useState<string[]>([])

  // State
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'

  function toggleHome(homeId: string) {
    setSelectedHomes(prev =>
      prev.includes(homeId) ? prev.filter(id => id !== homeId) : [...prev, homeId]
    )
  }

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return firstName.trim().length > 0 && lastName.trim().length > 0 && email.trim().length > 0 && email.includes('@')
      case 1:
        return true // Role always has a default, homes optional
      case 2:
        return !submitting
      default:
        return false
    }
  }

  function handleNext() {
    if (step < 2 && canProceed()) {
      setStep((step + 1) as Step)
      setError(null)
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep((step - 1) as Step)
      setError(null)
    }
  }

  async function handleSubmit() {
    if (!canProceed()) return
    setSubmitting(true)
    setError(null)

    try {
      // Generate a temporary password - the user will set their own when accepting
      const tempPassword = crypto.randomUUID().slice(0, 16)

      const res = await inviteUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: tempPassword,
        role: role as UserRole,
      })

      if (res.data.success && res.data.data) {
        const userId = res.data.data.id

        // Assign to selected homes
        for (const homeId of selectedHomes) {
          try {
            await addStaff(homeId, userId)
          } catch {
            // Continue even if one fails
            console.error(`Failed to add staff to home ${homeId}`)
          }
        }

        onSuccess()
      } else {
        setError(res.data.error?.message ?? 'Failed to send invitation')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setSubmitting(false)
    }
  }

  function renderStepIndicator() {
    return (
      <div className='flex items-center justify-center gap-2 mb-4'>
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === step
                ? 'bg-indigo-600 dark:bg-indigo-500'
                : i < step
                  ? 'bg-indigo-300 dark:bg-indigo-700'
                  : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          />
        ))}
      </div>
    )
  }

  function renderStep0() {
    return (
      <div className='space-y-4'>
        <div>
          <label className={labelClass}>
            First name <span className='text-red-500'>*</span>
          </label>
          <input
            type='text'
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder='John'
            className={inputClass}
            autoFocus
          />
        </div>

        <div>
          <label className={labelClass}>
            Last name <span className='text-red-500'>*</span>
          </label>
          <input
            type='text'
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder='Smith'
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            Email <span className='text-red-500'>*</span>
          </label>
          <input
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder='john.smith@example.com'
            className={inputClass}
          />
        </div>
      </div>
    )
  }

  function renderStep1() {
    return (
      <div className='space-y-4'>
        <div>
          <label className={labelClass}>Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'employee' | 'manager')}
            className={inputClass}
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Assign to Homes</label>
          <p className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>
            Select which homes this staff member can access
          </p>
          <div className='space-y-2 max-h-48 overflow-y-auto'>
            {homes.length === 0 ? (
              <p className='text-sm text-zinc-400 dark:text-zinc-500'>No homes available</p>
            ) : (
              homes.map((home: Home) => (
                <label
                  key={home.id}
                  className='flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors'
                >
                  <input
                    type='checkbox'
                    checked={selectedHomes.includes(home.id)}
                    onChange={() => toggleHome(home.id)}
                    className='w-4 h-4 accent-indigo-600'
                  />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-zinc-900 dark:text-white truncate'>
                      {home.name}
                    </p>
                    {home.address && (
                      <p className='text-xs text-zinc-500 dark:text-zinc-400 truncate'>
                        {home.address}
                      </p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderStep2() {
    const selectedHomeNames = homes
      .filter((h: Home) => selectedHomes.includes(h.id))
      .map((h: Home) => h.name)

    return (
      <div className='space-y-4'>
        <div className='bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-lg'>
              {firstName.charAt(0).toUpperCase()}{lastName.charAt(0).toUpperCase()}
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-base font-semibold text-zinc-900 dark:text-white truncate'>
                {firstName} {lastName}
              </p>
              <p className='text-sm text-zinc-500 dark:text-zinc-400 truncate'>{email}</p>
            </div>
          </div>

          <div className='border-t border-zinc-200 dark:border-zinc-700 pt-3'>
            <div className='flex justify-between items-center mb-2'>
              <span className='text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide'>Role</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                role === 'manager'
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              }`}>
                {role === 'manager' ? 'Manager' : 'Employee'}
              </span>
            </div>

            <div>
              <span className='text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide'>Assigned Homes</span>
              {selectedHomeNames.length === 0 ? (
                <p className='text-sm text-zinc-400 dark:text-zinc-500 mt-1'>No homes assigned</p>
              ) : (
                <div className='flex flex-wrap gap-1 mt-1'>
                  {selectedHomeNames.map(name => (
                    <span
                      key={name}
                      className='text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full'
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-3'>
          <div className='flex items-start gap-2'>
            <Mail className='w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0' />
            <p className='text-sm text-indigo-700 dark:text-indigo-300'>
              An invitation email will be sent to <strong>{email}</strong> with instructions to set up their account.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-xl md:rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 pb-8 max-h-[92vh] overflow-y-auto'>
        {/* Drag indicator (mobile) */}
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />

        <div className='px-4 pt-4'>
          {/* Header */}
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-bold text-zinc-900 dark:text-white'>
              Invite Staff Member
            </h2>
            <button
              onClick={onCancel}
              className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
            >
              <X className='w-5 h-5 text-zinc-500 dark:text-zinc-400' />
            </button>
          </div>

          {/* Step indicator */}
          {renderStepIndicator()}

          {/* Step title */}
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-4 text-center'>
            Step {step + 1}: {STEPS[step]}
          </p>

          {/* Step content */}
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}

          {/* Error message */}
          {error && (
            <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg mt-4'>
              {error}
            </p>
          )}

          {/* Navigation buttons */}
          <div className='flex gap-3 mt-6'>
            {step > 0 ? (
              <button
                onClick={handleBack}
                className='flex items-center justify-center gap-1 flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 min-h-[44px] transition-colors'
              >
                <ChevronLeft className='w-4 h-4' />
                Back
              </button>
            ) : (
              <button
                onClick={onCancel}
                className='flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 min-h-[44px] transition-colors'
              >
                Cancel
              </button>
            )}

            {step < 2 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className='flex items-center justify-center gap-1 flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 transition-colors'
              >
                Next
                <ChevronRight className='w-4 h-4' />
              </button>
            ) : (
              <button
                onClick={() => { void handleSubmit() }}
                disabled={!canProceed()}
                className='flex items-center justify-center gap-1 flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 transition-colors'
              >
                {submitting ? 'Sending...' : 'Send Invitation'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
