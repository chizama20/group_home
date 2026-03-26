import { useNavigate } from 'react-router-dom'

interface Props {
  openIncidentCount: number
  unfiledIposCount:  number
  staffOnShiftCount: number
}

export default function ManagerNeedsAttention({ openIncidentCount, unfiledIposCount, staffOnShiftCount }: Props) {
  const navigate = useNavigate()

  return (
    <div className='mx-4 mt-4'>
      <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Needs Your Attention</p>
      <div className='bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100'>

        <button
          onClick={() => navigate('/logs?tab=incident')}
          className='w-full flex items-center justify-between px-4 py-3.5 text-left min-h-[52px] active:bg-gray-50'
        >
          <span className='text-sm text-gray-700'>Incident sign-offs</span>
          <span className={`text-sm font-bold ${openIncidentCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {openIncidentCount > 0 ? openIncidentCount : '—'}
          </span>
        </button>

        <button
          onClick={() => navigate('/logs?tab=ipos')}
          className='w-full flex items-center justify-between px-4 py-3.5 text-left min-h-[52px] active:bg-gray-50'
        >
          <span className='text-sm text-gray-700'>IPOS compliance</span>
          <span className={`text-sm font-bold ${unfiledIposCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            {unfiledIposCount > 0 ? `${unfiledIposCount} unfiled` : '—'}
          </span>
        </button>

        <button
          onClick={() => navigate('/shift')}
          className='w-full flex items-center justify-between px-4 py-3.5 text-left min-h-[52px] active:bg-gray-50'
        >
          <span className='text-sm text-gray-700'>Staff on shift</span>
          <span className={`text-sm font-bold ${staffOnShiftCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
            {staffOnShiftCount > 0 ? staffOnShiftCount : '—'}
          </span>
        </button>

      </div>
    </div>
  )
}
