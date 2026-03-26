import { useNavigate } from 'react-router-dom'

interface Props {
  residentCount:    number
  overdueMedCount:  number
  unfiledIposCount: number
}

export default function ManagerStatsBar({ residentCount, overdueMedCount, unfiledIposCount }: Props) {
  const navigate = useNavigate()

  return (
    <div className='mx-4 mt-4 flex gap-2'>
      <button
        onClick={() => navigate('/residents')}
        className='flex-1 bg-white border border-gray-100 rounded-xl px-3 py-3 text-center min-h-[64px] active:bg-gray-50'
      >
        <p className='text-xl font-bold text-gray-900 leading-none'>{residentCount}</p>
        <p className='text-xs text-gray-500 mt-1'>Residents</p>
      </button>

      <button
        onClick={() => navigate('/medications')}
        className={`flex-1 border rounded-xl px-3 py-3 text-center min-h-[64px] active:opacity-80 ${
          overdueMedCount > 0
            ? 'bg-red-50 border-red-100'
            : 'bg-white border-gray-100'
        }`}
      >
        <p className={`text-xl font-bold leading-none ${overdueMedCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {overdueMedCount}
        </p>
        <p className={`text-xs mt-1 ${overdueMedCount > 0 ? 'text-red-500' : 'text-gray-500'}`}>Meds overdue</p>
      </button>

      <button
        onClick={() => navigate('/logs')}
        className={`flex-1 border rounded-xl px-3 py-3 text-center min-h-[64px] active:opacity-80 ${
          unfiledIposCount > 0
            ? 'bg-amber-50 border-amber-100'
            : 'bg-white border-gray-100'
        }`}
      >
        <p className={`text-xl font-bold leading-none ${unfiledIposCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
          {unfiledIposCount}
        </p>
        <p className={`text-xs mt-1 ${unfiledIposCount > 0 ? 'text-amber-500' : 'text-gray-500'}`}>IPOS pending</p>
      </button>
    </div>
  )
}
