import { type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { adminLogout } from '../../api/admin'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate  = useNavigate()

  async function handleLogout() {
    await adminLogout().catch(() => {})
    navigate('/admin/login', { replace: true })
  }

  const nav = [
    { path: '/admin/dashboard',  label: 'Dashboard' },
    { path: '/admin/requests',   label: 'Org Requests' },
    { path: '/admin/orgs',       label: 'All Orgs' },
  ]

  return (
    <div className='min-h-screen bg-gray-100 flex'>
      {/* Sidebar */}
      <aside className='w-52 bg-white border-r border-gray-200 flex flex-col'>
        <div className='px-4 py-5 border-b border-gray-200'>
          <p className='text-xs font-bold text-gray-400 uppercase tracking-wider'>Admin Panel</p>
        </div>
        <nav className='flex-1 px-3 py-4 space-y-1'>
          {nav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname.startsWith(item.path)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className='px-3 py-4 border-t border-gray-200'>
          <button
            onClick={() => { void handleLogout() }}
            className='w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors'
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className='flex-1 p-8 overflow-auto'>
        {children}
      </main>
    </div>
  )
}
