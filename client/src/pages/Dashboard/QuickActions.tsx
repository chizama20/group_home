import { useNavigate } from 'react-router-dom'

const ACTIONS = [
  { label: 'New log',    icon: '📝', path: '/logs' },
  { label: 'Incident',   icon: '⚠️', path: '/logs?tab=incident' },
  { label: 'Shift note', icon: '💬', path: '/shift' },
] as const

export default function QuickActions() {
  const navigate = useNavigate()

  return (
    <div className='mx-4 mt-4'>
      <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Quick Actions</p>
      <div className='grid grid-cols-3 gap-3'>
        {ACTIONS.map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className='bg-white border border-gray-100 rounded-xl py-4 flex flex-col items-center gap-1.5 min-h-[80px] active:bg-gray-50'
          >
            <span className='text-xl'>{a.icon}</span>
            <span className='text-xs font-medium text-gray-700'>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
