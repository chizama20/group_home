import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import type { ApiResponse } from '../../types/api'

const FACILITY_TYPES = [
  { value: 'group_home',      label: 'Group Home' },
  { value: 'assisted_living', label: 'Assisted Living' },
  { value: 'foster_care',     label: 'Foster Care' },
  { value: 'supported_living',label: 'Supported Living' },
  { value: 'day_program',     label: 'Day Program' },
  { value: 'other',           label: 'Other' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

export default function RequestAccessPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const [form, setForm] = useState({
    org_name:           '',
    facility_type:      '',
    contact_name:       '',
    contact_email:      '',
    contact_phone:      '',
    num_homes:          '',
    state:              '',
    current_operations: '',
    additional_notes:   '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.post<ApiResponse<{ message: string }>>('/register', {
        ...form,
        num_homes: Number(form.num_homes),
      })
      setSubmitted(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setError(e?.response?.data?.error?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'

  if (submitted) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4'>
        <div className='w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center'>
          <div className='w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg className='w-6 h-6 text-emerald-600 dark:text-emerald-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
            </svg>
          </div>
          <h2 className='text-xl font-bold text-zinc-900 dark:text-white mb-2'>Request received</h2>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6'>
            We'll review your request and be in touch at <strong>{form.contact_email}</strong>.
          </p>
          <Link to='/login' className='text-sm text-primary dark:text-primary hover:underline'>
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4'>
      <div className='w-full max-w-lg mx-auto'>
        <div className='mb-6'>
          <Link to='/login' className='text-sm text-zinc-500 dark:text-zinc-400 hover:underline'>← Back to sign in</Link>
        </div>

        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6'>
          <h1 className='text-2xl font-bold text-zinc-900 dark:text-white mb-1'>Request access</h1>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6'>
            Tell us about your organisation and we'll get you set up.
          </p>

          <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>

            <div>
              <label className={labelClass}>Organisation name <span className='text-red-500'>*</span></label>
              <input type='text' required value={form.org_name} onChange={e => set('org_name', e.target.value)}
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Facility type <span className='text-red-500'>*</span></label>
              <select required value={form.facility_type} onChange={e => set('facility_type', e.target.value)}
                className={inputClass}>
                <option value=''>Select facility type</option>
                {FACILITY_TYPES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className={labelClass}>Your full name <span className='text-red-500'>*</span></label>
                <input type='text' required value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone <span className='text-red-500'>*</span></label>
                <input type='tel' required value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                  className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email <span className='text-red-500'>*</span></label>
              <input type='email' required value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                className={inputClass} />
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className={labelClass}>Number of locations <span className='text-red-500'>*</span></label>
                <input type='number' required min={1} value={form.num_homes} onChange={e => set('num_homes', e.target.value)}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>State <span className='text-red-500'>*</span></label>
                <select required value={form.state} onChange={e => set('state', e.target.value)}
                  className={inputClass}>
                  <option value=''>Select state</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>How do you currently manage operations?</label>
              <textarea rows={2} value={form.current_operations} onChange={e => set('current_operations', e.target.value)}
                placeholder='Paper, spreadsheets, other software...'
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none' />
            </div>

            <div>
              <label className={labelClass}>Anything else we should know?</label>
              <textarea rows={2} value={form.additional_notes} onChange={e => set('additional_notes', e.target.value)}
                className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none' />
            </div>

            {error && (
              <p className='text-sm text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg'>{error}</p>
            )}

            <button type='submit' disabled={loading}
              className='w-full bg-primary text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-primary disabled:opacity-50 transition-colors'>
              {loading ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
