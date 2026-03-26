import type { Appointment } from '../../types/appointment'

const TYPE_CHIP: Record<string, string> = {
  'GP Visit':   'bg-blue-100 text-blue-700',
  'Therapy':    'bg-purple-100 text-purple-700',
  'Hospital':   'bg-red-100 text-red-700',
  'Specialist': 'bg-orange-100 text-orange-700',
  'Pickup':     'bg-green-100 text-green-700',
  'Outing':     'bg-teal-100 text-teal-700',
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

interface Props {
  appointments:     Appointment[]
  onAddAppointment: () => void
}

export default function UpcomingAppointments({ appointments, onAddAppointment }: Props) {
  const shown = appointments.slice(0, 3)
  if (!shown.length) return null

  return (
    <div className='mx-4 mt-4'>
      <div className='flex items-center justify-between mb-2'>
        <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Appointments</p>
        <button
          onClick={onAddAppointment}
          className='text-xs font-semibold text-blue-600 min-h-[44px] flex items-center px-2 -mr-2'
        >
          + Add
        </button>
      </div>
      <div className='bg-white rounded-xl border border-gray-100 divide-y divide-gray-50'>
        {shown.map(appt => (
          <div key={appt.id} className='flex items-center gap-3 px-4 py-3'>
            <div className='w-12 text-center shrink-0'>
              <p className='text-xs font-bold text-gray-900'>
                {appt.appointment_time ?? '—'}
              </p>
              <p className='text-[10px] text-gray-400 mt-0.5'>{shortDate(appt.appointment_date)}</p>
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-gray-900 truncate'>{appt.title}</p>
              {appt.location && (
                <p className='text-xs text-gray-500 truncate mt-0.5'>{appt.location}</p>
              )}
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${TYPE_CHIP[appt.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {appt.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
