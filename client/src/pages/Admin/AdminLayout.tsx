import { type ReactNode, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { adminLogout } from '../../api/admin'
import { LayoutDashboard, Building2, ClipboardList, LogOut } from 'lucide-react'
import { useInactivityTimer } from '../../hooks/useInactivityTimer'

const nav = [
  { path: '/admin/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/admin/requests',  label: 'Org Requests', icon: ClipboardList },
  { path: '/admin/orgs',      label: 'All Orgs',     icon: Building2 },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const [showWarning, setShowWarning] = useState(false)

  const doLogout = useCallback(async () => {
    await adminLogout().catch(() => {})
    sessionStorage.removeItem('admin_authed')
    navigate('/admin/login', { replace: true })
  }, [navigate])

  async function handleLogout() { await doLogout() }

  useInactivityTimer({
    enabled:   true,
    onWarning: () => setShowWarning(true),
    onLogout:  () => { setShowWarning(false); void doLogout() },
  })

  return (
    <div className='min-h-screen bg-zinc-100 dark:bg-zinc-950 flex'>
      {/* Sidebar */}
      <aside className='w-52 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col'>
        <div className='px-4 py-5 border-b border-zinc-200 dark:border-zinc-800'>
          <p className='text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider'>Admin Panel</p>
        </div>
        <nav className='flex-1 px-3 py-4 space-y-1'>
          {nav.map(item => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary dark:bg-primary/10 text-primary dark:text-primary'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className='h-4 w-4 shrink-0' />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className='px-3 py-4 border-t border-zinc-200 dark:border-zinc-800'>
          <button
            onClick={() => { void handleLogout() }}
            className='flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors'
          >
            <LogOut className='h-4 w-4 shrink-0' />
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className='flex-1 p-6 md:p-8 overflow-auto'>
        <div className='max-w-6xl mx-auto'>
          {showWarning && (
            <div className='mb-4 flex items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-xl text-sm'>
              <span>Your session is about to expire due to inactivity.</span>
              <button
                onClick={() => setShowWarning(false)}
                className='shrink-0 font-semibold underline hover:no-underline'
              >
                Stay logged in
              </button>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
