import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useHome } from '@/context/HomeContext'
import { cn } from '@/lib/utils'
import OfflineBanner from '@/components/OfflineBanner'
import { getTheme, toggleTheme } from '@/lib/theme'
import {
  Home, Users, FileText, CalendarDays, Settings,
  Sun, Moon, ChevronLeft, ChevronRight, ChevronsUpDown,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',          label: 'Home',      icon: Home,         exact: true },
  { to: '/residents', label: 'Residents', icon: Users },
  { to: '/logs',      label: 'Logs',      icon: FileText },
  { to: '/calendar',  label: 'Calendar',  icon: CalendarDays },
  { to: '/settings',  label: 'Settings',  icon: Settings },
]

interface Props { children: React.ReactNode }

export default function AppLayout({ children }: Props) {
  const { user, logout }                    = useAuth()
  const { homes, selectedHome, selectHome } = useHome()
  const navigate                            = useNavigate()
  const [collapsed, setCollapsed]           = useState(false)
  const [showHomePicker, setShowHomePicker] = useState(false)
  const [theme, setThemeState]              = useState(getTheme)

  function handleThemeToggle() {
    const next = toggleTheme()
    setThemeState(next)
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = user
    ? `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase()
    : '??'

  const roleColors: Record<string, string> = {
    org_admin: 'bg-amber-500/20 text-amber-400',
    manager:   'bg-violet-500/20 text-violet-400',
    employee:  'bg-zinc-700 text-zinc-300',
  }
  const avatarColor = roleColors[user?.role ?? 'employee'] ?? roleColors.employee

  return (
    <div className='flex h-screen overflow-hidden bg-zinc-50 dark:bg-black'>
      <OfflineBanner />

      {/* ── Desktop sidebar ≥ 768px ──────────────────────────────────────────── */}
      <aside className={cn(
        'hidden md:flex flex-col shrink-0 border-r border-zinc-200 dark:border-zinc-800',
        'bg-white dark:bg-zinc-950 transition-all duration-200',
        collapsed ? 'w-[68px]' : 'w-60'
      )}>

        {/* Logo / home name */}
        <div className='flex items-center justify-between px-3 py-4 border-b border-zinc-200 dark:border-zinc-800 min-h-[60px]'>
          {!collapsed && (
            <div className='flex-1 min-w-0 mr-2'>
              <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
                Group Home
              </p>
              <p className='text-sm font-semibold text-zinc-900 dark:text-white truncate'>
                {selectedHome?.name ?? 'No home selected'}
              </p>
            </div>
          )}
          {homes.length > 1 && !collapsed && (
            <button
              onClick={() => setShowHomePicker(v => !v)}
              className='p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-600 transition-colors'
              title='Switch home'
            >
              <ChevronsUpDown className='h-4 w-4' />
            </button>
          )}
        </div>

        {/* Home picker */}
        {showHomePicker && !collapsed && (
          <div className='border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'>
            {homes.map(h => (
              <button
                key={h.id}
                onClick={() => { selectHome(h.id); setShowHomePicker(false) }}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm transition-colors',
                  'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                  h.id === selectedHome?.id
                    ? 'font-semibold text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-700 dark:text-zinc-300'
                )}
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

        {/* Nav */}
        <nav className='flex-1 px-2 py-3 space-y-0.5 overflow-y-auto'>
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              title={collapsed ? label : undefined}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              <Icon className='h-[18px] w-[18px] shrink-0' />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: theme toggle + profile + collapse */}
        <div className='border-t border-zinc-200 dark:border-zinc-800 p-2 space-y-1'>
          {/* Theme toggle */}
          <button
            onClick={handleThemeToggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={cn(
              'flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm transition-colors min-h-[44px]',
              'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            {theme === 'dark'
              ? <Sun className='h-[18px] w-[18px] shrink-0' />
              : <Moon className='h-[18px] w-[18px] shrink-0' />
            }
            {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>

          {/* Profile */}
          {!collapsed && user && (
            <div className='flex items-center gap-2.5 px-3 py-2'>
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor)}>
                {initials}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-semibold text-zinc-900 dark:text-white truncate'>
                  {user.first_name} {user.last_name}
                </p>
                <p className='text-[11px] text-zinc-500 capitalize'>
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(v => !v)}
            className='flex items-center justify-center w-full rounded-xl p-2.5 text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors'
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className='h-4 w-4' /> : <ChevronLeft className='h-4 w-4' />}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className='flex-1 min-w-0 overflow-y-auto'>
        {/* Mobile header (only on <md) */}
        <header className='md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800'>
          <p className='text-sm font-semibold text-zinc-900 dark:text-white truncate'>
            {selectedHome?.name ?? 'Group Home'}
          </p>
          <div className='flex items-center gap-2'>
            <button
              onClick={handleThemeToggle}
              className='w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
            >
              {theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
            </button>
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold', avatarColor)}>
              {initials}
            </div>
          </div>
        </header>

        <main className='pb-24 md:pb-0'>
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar < 768px ──────────────────────────────────────── */}
      <nav
        className='md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800'
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1 min-h-[56px]',
              'text-[10px] font-medium transition-colors',
              isActive
                ? 'text-indigo-600 dark:text-indigo-500'
                : 'text-zinc-500'
            )}
          >
            <Icon className='h-[22px] w-[22px]' />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
