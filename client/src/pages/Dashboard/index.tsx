import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'

const NAV_CARDS = [
  { path: '/residents',   label: 'Residents',   icon: '👤', description: 'View and manage residents' },
  { path: '/logs',        label: 'Logs',        icon: '📄', description: 'IPOS and shift notes' },
  { path: '/medications', label: 'Medications', icon: '💊', description: 'Medication administration' },
  { path: '/shift',       label: 'Shift',       icon: '🕐', description: 'Tasks and roster' },
]

export default function DashboardPage() {
  const { user, org, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className='pb-20 min-h-screen bg-gray-50'>
      <div className='bg-white px-4 pt-6 pb-4 border-b border-gray-100'>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-xl font-bold text-gray-900'>
              {user ? `Hi, ${user.first_name}` : 'Dashboard'}
            </h1>
            <p className='text-sm text-gray-500 capitalize'>{user?.role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={logout}
            className='text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] hover:bg-gray-50'
          >
            Sign out
          </button>
        </div>

        {org && (
          <div className='mt-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2'>
            <span className='text-xs text-blue-700 font-medium'>{org.name}</span>
            <span className='text-xs text-blue-400 ml-2 font-mono'>{org.id}</span>
          </div>
        )}
      </div>

      <div className='grid grid-cols-2 gap-3 p-4'>
        {NAV_CARDS.map(card => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className='bg-white rounded-xl shadow-sm p-4 text-left min-h-[100px] hover:shadow-md transition-shadow'
          >
            <span className='text-2xl block mb-2'>{card.icon}</span>
            <p className='font-semibold text-gray-900 text-sm'>{card.label}</p>
            <p className='text-xs text-gray-500 mt-0.5'>{card.description}</p>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
