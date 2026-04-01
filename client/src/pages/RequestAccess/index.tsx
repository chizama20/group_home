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
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
        <div className='w-full max-w-md bg-white rounded-xl shadow-sm p-8 text-center'>
          <div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg className='w-6 h-6 text-green-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
            </svg>
          </div>
          <h2 className='text-xl font-bold text-gray-900 mb-2'>Request received</h2>
          <p className='text-sm text-gray-500 mb-6'>
            We'll review your request and be in touch at <strong>{form.contact_email}</strong>.
          </p>
          <Link to='/login' className='text-sm text-blue-600 hover:underline'>
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8 px-4'>
      <div className='w-full max-w-lg mx-auto'>
        <div className='mb-6'>
          <Link to='/login' className='text-sm text-gray-500 hover:underline'>← Back to sign in</Link>
        </div>

        <div className='bg-white rounded-xl shadow-sm p-6'>
          <h1 className='text-2xl font-bold text-gray-900 mb-1'>Request access</h1>
          <p className='text-sm text-gray-500 mb-6'>
            Tell us about your organisation and we'll get you set up.
          </p>

          <form onSubmit={e => { void handleSubmit(e) }} className='space-y-4'>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Organisation name <span className='text-red-500'>*</span></label>
              <input type='text' required value={form.org_name} onChange={e => set('org_name', e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500' />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Facility type <span className='text-red-500'>*</span></label>
              <select required value={form.facility_type} onChange={e => set('facility_type', e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'>
                <option value=''>Select facility type</option>
                {FACILITY_TYPES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Your full name <span className='text-red-500'>*</span></label>
                <input type='text' required value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500' />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Phone <span className='text-red-500'>*</span></label>
                <input type='tel' required value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500' />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Email <span className='text-red-500'>*</span></label>
              <input type='email' required value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500' />
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Number of locations <span className='text-red-500'>*</span></label>
                <input type='number' required min={1} value={form.num_homes} onChange={e => set('num_homes', e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500' />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>State <span className='text-red-500'>*</span></label>
                <select required value={form.state} onChange={e => set('state', e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'>
                  <option value=''>Select state</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>How do you currently manage operations?</label>
              <textarea rows={2} value={form.current_operations} onChange={e => set('current_operations', e.target.value)}
                placeholder='Paper, spreadsheets, other software...'
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none' />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Anything else we should know?</label>
              <textarea rows={2} value={form.additional_notes} onChange={e => set('additional_notes', e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none' />
            </div>

            {error && (
              <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{error}</p>
            )}

            <button type='submit' disabled={loading}
              className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'>
              {loading ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
