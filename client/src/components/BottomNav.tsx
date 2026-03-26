import { NavLink } from 'react-router-dom'

const tabs = [
  { path: '/residents',   label: 'Residents', icon: '👤' },
  { path: '/logs',        label: 'Logs',      icon: '📄' },
  { path: '/',            label: 'Home',      icon: '🏠' },
  { path: '/medications', label: 'Meds',      icon: '💊' },
  { path: '/shift',       label: 'Shift',     icon: '🕐' },
]

export default function BottomNav() {
  return (
    <nav className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50'>
      {tabs.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center text-xs gap-1 px-3 py-2 min-h-[44px] ${
              isActive ? 'text-blue-700 font-semibold' : 'text-gray-500'
            }`
          }
        >
          <span className='text-xl'>{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
