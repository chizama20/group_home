import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '../../api/client'
import type { ApiResponse } from '../../types/api'

const FACILITY_TYPES = [
  { value: 'group_home',       label: 'Group Home' },
  { value: 'assisted_living',  label: 'Assisted Living' },
  { value: 'foster_care',      label: 'Foster Care' },
  { value: 'supported_living', label: 'Supported Living' },
  { value: 'day_program',      label: 'Day Program' },
  { value: 'other',            label: 'Other' },
] as const

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const schema = z.object({
  org_name:           z.string().min(1, 'Organisation name is required'),
  facility_type:      z.string().min(1, 'Please select a facility type'),
  contact_name:       z.string().min(1, 'Your name is required'),
  contact_phone:      z.string().regex(/^\+?[\d\s\-().]{7,20}$/, 'Enter a valid phone number'),
  contact_email:      z.string().email('Enter a valid email address'),
  num_homes:          z.coerce.number({ invalid_type_error: 'Enter a number' }).int().min(1, 'Must be at least 1').max(999, 'Maximum 999 locations'),
  state:              z.string().min(1, 'Please select a state'),
  current_operations: z.string().optional(),
  additional_notes:   z.string().optional(),
})

type FormData = z.infer<typeof schema>

const INPUT_CLS = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
const SELECT_CLS = INPUT_CLS + ' bg-white'

export default function RequestAccessPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      await api.post<ApiResponse<{ message: string }>>('/register', data)
      setSubmittedEmail(data.contact_email)
      setSubmitted(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setError('root', {
        message: e?.response?.data?.error?.message ?? 'Something went wrong. Please try again.',
      })
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
            We'll review your request and be in touch at <strong>{submittedEmail}</strong>.
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

          <form onSubmit={e => { void handleSubmit(onSubmit)(e) }} className='space-y-4'>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Organisation name <span className='text-red-500'>*</span>
              </label>
              <input type='text' {...register('org_name')} className={INPUT_CLS} />
              {errors.org_name && <p className='text-xs text-red-600 mt-1'>{errors.org_name.message}</p>}
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Facility type <span className='text-red-500'>*</span>
              </label>
              <select {...register('facility_type')} className={SELECT_CLS}>
                <option value=''>Select facility type</option>
                {FACILITY_TYPES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              {errors.facility_type && <p className='text-xs text-red-600 mt-1'>{errors.facility_type.message}</p>}
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Your full name <span className='text-red-500'>*</span>
                </label>
                <input type='text' {...register('contact_name')} className={INPUT_CLS} />
                {errors.contact_name && <p className='text-xs text-red-600 mt-1'>{errors.contact_name.message}</p>}
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Phone <span className='text-red-500'>*</span>
                </label>
                <input type='tel' {...register('contact_phone')} className={INPUT_CLS} />
                {errors.contact_phone && <p className='text-xs text-red-600 mt-1'>{errors.contact_phone.message}</p>}
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Email <span className='text-red-500'>*</span>
              </label>
              <input type='email' {...register('contact_email')} className={INPUT_CLS} />
              {errors.contact_email && <p className='text-xs text-red-600 mt-1'>{errors.contact_email.message}</p>}
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Number of locations <span className='text-red-500'>*</span>
                </label>
                <input type='number' min={1} max={999} {...register('num_homes')} className={INPUT_CLS} />
                {errors.num_homes && <p className='text-xs text-red-600 mt-1'>{errors.num_homes.message}</p>}
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  State <span className='text-red-500'>*</span>
                </label>
                <select {...register('state')} className={SELECT_CLS}>
                  <option value=''>Select state</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <p className='text-xs text-red-600 mt-1'>{errors.state.message}</p>}
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                How do you currently manage operations?
              </label>
              <textarea
                rows={2}
                {...register('current_operations')}
                placeholder='Paper, spreadsheets, other software...'
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Anything else we should know?
              </label>
              <textarea
                rows={2}
                {...register('additional_notes')}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'
              />
            </div>

            {errors.root && (
              <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{errors.root.message}</p>
            )}

            <button
              type='submit'
              disabled={isSubmitting}
              className='w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors'
            >
              {isSubmitting ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
