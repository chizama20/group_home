import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Mail } from 'lucide-react'
import { inviteUser } from '../api/orgs'
import { useHome } from '../context/HomeContext'
import type { Home } from '../api/homes'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

const STEPS = ['Email', 'Home', 'Review'] as const
type Step = 0 | 1 | 2

export default function InviteStaffWizard({ onSuccess, onCancel }: Props) {
  const { homes } = useHome()
  const [step, setStep] = useState<Step>(0)

  // Form fields
  const [email, setEmail] = useState('')
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null)

  // State
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return email.trim().length > 0 && isValidEmail(email.trim())
      case 1:
        return true // Home is optional
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
      const res = await inviteUser({
        email: email.trim().toLowerCase(),
        role: 'staff',
        home_ids: selectedHomeId ? [selectedHomeId] : undefined,
      })

      if (res.data.success) {
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
                ? 'bg-primary dark:bg-primary'
                : i < step
                  ? 'bg-primary dark:bg-primary'
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
            Email Address <span className='text-red-500'>*</span>
          </label>
          <input
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder='staff@example.com'
            className={inputClass}
            autoFocus
          />
          <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-2'>
            An invitation email will be sent to this address with a link to create their account.
          </p>
        </div>
      </div>
    )
  }

  function renderStep1() {
    return (
      <div className='space-y-4'>
        <div>
          <label className={labelClass}>Assign to Home (Optional)</label>
          <p className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>
            Select an initial home assignment for this staff member
          </p>
          <div className='space-y-2 max-h-48 overflow-y-auto'>
            <label
              className={`flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 border rounded-xl cursor-pointer transition-colors ${
                selectedHomeId === null
                  ? 'border-primary bg-primary dark:bg-primary/10'
                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
              }`}
            >
              <input
                type='radio'
                name='home'
                checked={selectedHomeId === null}
                onChange={() => setSelectedHomeId(null)}
                className='w-4 h-4 accent-primary'
              />
              <span className='text-sm text-zinc-600 dark:text-zinc-400'>No home (assign later)</span>
            </label>
            {homes.length === 0 ? (
              <p className='text-sm text-zinc-400 dark:text-zinc-500 p-3'>No homes available</p>
            ) : (
              homes.map((home: Home) => (
                <label
                  key={home.id}
                  className={`flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 border rounded-xl cursor-pointer transition-colors ${
                    selectedHomeId === home.id
                      ? 'border-primary bg-primary dark:bg-primary/10'
                      : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                  }`}
                >
                  <input
                    type='radio'
                    name='home'
                    checked={selectedHomeId === home.id}
                    onChange={() => setSelectedHomeId(home.id)}
                    className='w-4 h-4 accent-primary'
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
    const selectedHome = homes.find((h: Home) => h.id === selectedHomeId)

    return (
      <div className='space-y-4'>
        <div className='bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary dark:text-primary'>
              <Mail className='w-5 h-5' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-base font-semibold text-zinc-900 dark:text-white truncate'>
                {email}
              </p>
              <p className='text-sm text-zinc-500 dark:text-zinc-400'>Invitation will be sent</p>
            </div>
          </div>

          <div className='border-t border-zinc-200 dark:border-zinc-700 pt-3 space-y-2'>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide'>Role</span>
              <span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400'>
                Staff
              </span>
            </div>

            <div className='flex justify-between items-center'>
              <span className='text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide'>Home</span>
              <span className='text-sm text-zinc-700 dark:text-zinc-300'>
                {selectedHome?.name ?? 'None assigned'}
              </span>
            </div>
          </div>
        </div>

        <div className='bg-primary dark:bg-primary/10 border border-primary dark:border-primary/20 rounded-xl p-3'>
          <div className='flex items-start gap-2'>
            <Mail className='w-4 h-4 text-primary dark:text-primary mt-0.5 shrink-0' />
            <div className='text-sm text-primary dark:text-primary'>
              <p>The recipient will receive an email with a link to:</p>
              <ul className='list-disc list-inside mt-1 text-xs space-y-0.5'>
                <li>Set up their name and password</li>
                <li>Create their account</li>
                <li>Access the application</li>
              </ul>
              <p className='mt-2 text-xs'>The invitation expires in 48 hours.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-xl md:rounded-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 pb-8 max-h-[92vh] overflow-y-auto'>
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
                className='flex items-center justify-center gap-1 flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-primary/90 disabled:opacity-50 transition-colors'
              >
                Next
                <ChevronRight className='w-4 h-4' />
              </button>
            ) : (
              <button
                onClick={() => { void handleSubmit() }}
                disabled={!canProceed()}
                className='flex items-center justify-center gap-1 flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-primary/90 disabled:opacity-50 transition-colors'
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
