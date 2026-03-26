import { useNavigate } from 'react-router-dom'

interface Props {
  overdueMedCount:  number
  unfiledIposCount: number
}

export default function NeedsAttention({ overdueMedCount, unfiledIposCount }: Props) {
  const navigate = useNavigate()

  if (!overdueMedCount && !unfiledIposCount) return null

  return (
    <div className='mx-4 mt-4'>
      <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Needs Attention</p>
      <div className='flex gap-3'>
        {overdueMedCount > 0 && (
          <button
            onClick={() => navigate('/medications')}
            className='flex-1 bg-red-50 border border-red-100 rounded-xl p-3 text-left min-h-[72px] active:bg-red-100'
          >
            <p className='text-2xl font-bold text-red-600 leading-none'>{overdueMedCount}</p>
            <p className='text-xs text-red-500 font-medium mt-1'>Overdue meds</p>
          </button>
        )}
        {unfiledIposCount > 0 && (
          <button
            onClick={() => navigate('/logs')}
            className='flex-1 bg-amber-50 border border-amber-100 rounded-xl p-3 text-left min-h-[72px] active:bg-amber-100'
          >
            <p className='text-2xl font-bold text-amber-600 leading-none'>{unfiledIposCount}</p>
            <p className='text-xs text-amber-500 font-medium mt-1'>Unfiled IPOS</p>
          </button>
        )}
      </div>
    </div>
  )
}
