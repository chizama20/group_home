import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createResident, updateResident } from '../../api/residents'
import type { Resident } from '../../types/resident'

const schema = z.object({
  first_name:               z.string().min(1, 'First name is required').max(100),
  last_name:                z.string().min(1, 'Last name is required').max(100),
  date_of_birth:            z.string().min(1, 'Date of birth is required'),
  room:                     z.string().max(50).optional(),
  diagnosis:                z.string().max(1000).optional(),
  physician:                z.string().max(200).optional(),
  primary_contact_name:     z.string().max(200).optional(),
  primary_contact_phone:    z.string().max(30).optional(),
  primary_contact_relation: z.string().max(100).optional(),
  notes:                    z.string().max(5000).optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  homeId?:   string
  resident?: Resident
  onSuccess: () => void
  onCancel:  () => void
}

const INPUT_CLS = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function ResidentForm({ homeId, resident, onSuccess, onCancel }: Props) {
  const isEdit = Boolean(resident)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name:               resident?.first_name ?? '',
      last_name:                resident?.last_name ?? '',
      date_of_birth:            resident?.date_of_birth ?? '',
      room:                     resident?.room ?? '',
      diagnosis:                resident?.diagnosis ?? '',
      physician:                resident?.physician ?? '',
      primary_contact_name:     resident?.primary_contact_name ?? '',
      primary_contact_phone:    resident?.primary_contact_phone ?? '',
      primary_contact_relation: resident?.primary_contact_relation ?? '',
      notes:                    resident?.notes ?? '',
    },
  })

  async function onSubmit(data: FormData) {
    const payload = {
      first_name:               data.first_name,
      last_name:                data.last_name,
      date_of_birth:            data.date_of_birth,
      room:                     data.room || undefined,
      diagnosis:                data.diagnosis || undefined,
      physician:                data.physician || undefined,
      primary_contact_name:     data.primary_contact_name || undefined,
      primary_contact_phone:    data.primary_contact_phone || undefined,
      primary_contact_relation: data.primary_contact_relation || undefined,
      notes:                    data.notes || undefined,
    }

    try {
      if (isEdit && resident) {
        await updateResident(resident.id, payload)
        toast.success('Resident updated')
      } else if (homeId) {
        await createResident(homeId, payload)
        toast.success('Resident added')
      }
      onSuccess()
    } catch {
      toast.error('Failed to save. Please try again.')
    }
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/40 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[92vh] flex flex-col'>
        <div className='w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 shrink-0' />

        <div className='px-4 pt-3 pb-2 border-b border-gray-100 shrink-0'>
          <h2 className='text-base font-semibold text-gray-900'>
            {isEdit ? 'Edit resident' : 'Add resident'}
          </h2>
        </div>

        <form
          onSubmit={e => { void handleSubmit(onSubmit)(e) }}
          className='overflow-y-auto flex-1 px-4 py-4 space-y-4 pb-8'
        >
          {/* Required fields */}
          <div>
            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Required</p>
            <div className='space-y-3'>
              <div>
                <input type='text' placeholder='First name' {...register('first_name')} className={INPUT_CLS} />
                {errors.first_name && <p className='text-xs text-red-600 mt-1'>{errors.first_name.message}</p>}
              </div>
              <div>
                <input type='text' placeholder='Last name' {...register('last_name')} className={INPUT_CLS} />
                {errors.last_name && <p className='text-xs text-red-600 mt-1'>{errors.last_name.message}</p>}
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Date of birth</label>
                <input type='date' {...register('date_of_birth')} className={INPUT_CLS} />
                {errors.date_of_birth && <p className='text-xs text-red-600 mt-1'>{errors.date_of_birth.message}</p>}
              </div>
            </div>
          </div>

          {/* Optional fields */}
          <div>
            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Optional</p>
            <div className='space-y-3'>
              <input type='text' placeholder='Room number' {...register('room')} className={INPUT_CLS} />
              <textarea
                placeholder='Diagnosis' rows={2}
                {...register('diagnosis')}
                className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <input type='text' placeholder='Physician name' {...register('physician')} className={INPUT_CLS} />
            </div>
          </div>

          {/* Primary contact */}
          <div>
            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Primary Contact</p>
            <div className='space-y-3'>
              <input type='text' placeholder='Contact name' {...register('primary_contact_name')} className={INPUT_CLS} />
              <input type='tel' placeholder='Contact phone' {...register('primary_contact_phone')} className={INPUT_CLS} />
              <input type='text' placeholder='Relationship (e.g. daughter)' {...register('primary_contact_relation')} className={INPUT_CLS} />
            </div>
          </div>

          {/* Notes */}
          <textarea
            placeholder='General notes' rows={3}
            {...register('notes')}
            className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
          />

          <div className='flex gap-2 pt-2'>
            <button
              type='button' onClick={onCancel}
              className='flex-1 border border-gray-300 rounded-xl py-3 text-sm text-gray-600 min-h-[44px]'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'
            >
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add resident'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
