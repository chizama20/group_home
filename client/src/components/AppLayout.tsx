import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useHome } from '@/context/HomeContext'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import OfflineBanner from '@/components/OfflineBanner'
import {
  Users, FileText, Home, Pill, Clock,
  ChevronLeft, ChevronRight, LogOut, ChevronsUpDown,
} from 'lucide-react'

const FACILITY_LABELS: Record<string, string> = {
  group_home:      'Group Home',
  assisted_living: 'Assisted Living',
  foster_care:     'Foster Care',
  supported_living:'Supported Living',
  day_program:     'Day Program',
  other:           'Other',
}

const NAV_ITEMS = [
  { to: '/residents',  label: 'Residents', icon: Users  },
  { to: '/logs',       label: 'Logs',      icon: FileText },
  { to: '/',           label: 'Home',      icon: Home,  exact: true },
  { to: '/medications',label: 'Meds',      icon: Pill   },
  { to: '/shift',      label: 'Shift',     icon: Clock  },
]

interface Props { children: React.ReactNode }

export default function AppLayout({ children }: Props) {
  const { user, logout }       = useAuth()
  const { homes, selectedHome, selectHome } = useHome()
  const navigate                = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [showHomePicker, setShowHomePicker] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const facilityType = selectedHome?.facility_type

  return (
    <div className='flex h-screen overflow-hidden bg-background'>
      <OfflineBanner />

      {/* ── Desktop sidebar ≥ 768px ──────────────────────────────────────────── */}
      <aside className={cn(
        'hidden md:flex flex-col border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}>
        {/* Home name + switcher */}
        <div className='flex items-center justify-between px-3 py-4 border-b border-border min-h-[60px]'>
          {!collapsed && (
            <div className='flex-1 min-w-0 mr-2'>
              <p className='text-sm font-semibold text-foreground truncate'>
                {selectedHome?.name ?? 'No home selected'}
              </p>
              {facilityType && (
                <Badge variant='secondary' className='text-xs mt-0.5'>
                  {FACILITY_LABELS[facilityType] ?? facilityType}
                </Badge>
              )}
            </div>
          )}
          {homes.length > 1 && !collapsed && (
            <button
              onClick={() => setShowHomePicker(v => !v)}
              className='p-1 rounded-md hover:bg-muted text-muted-foreground'
              title='Switch home'
            >
              <ChevronsUpDown className='h-4 w-4' />
            </button>
          )}
        </div>

        {/* Home picker dropdown */}
        {showHomePicker && !collapsed && (
          <div className='border-b border-border bg-muted/50'>
            {homes.map(h => (
              <button
                key={h.id}
                onClick={() => { selectHome(h.id); setShowHomePicker(false) }}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors',
                  h.id === selectedHome?.id && 'font-semibold text-primary'
                )}
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

        {/* Nav items */}
        <nav className='flex-1 px-2 py-3 space-y-1 overflow-y-auto'>
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className='h-5 w-5 shrink-0' />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user + logout + collapse toggle */}
        <div className='border-t border-border p-2 space-y-1'>
          {!collapsed && user && (
            <div className='px-3 py-2'>
              <p className='text-xs font-medium text-foreground truncate'>
                {user.first_name} {user.last_name}
              </p>
              <p className='text-xs text-muted-foreground capitalize'>{user.role.replace('_', ' ')}</p>
            </div>
          )}
          <button
            onClick={() => { void handleLogout() }}
            className={cn(
              'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors min-h-[44px]',
            )}
            title={collapsed ? 'Log out' : undefined}
          >
            <LogOut className='h-5 w-5 shrink-0' />
            {!collapsed && <span>Log out</span>}
          </button>
          <button
            onClick={() => setCollapsed(v => !v)}
            className='flex items-center justify-center w-full rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors'
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className='h-4 w-4' /> : <ChevronLeft className='h-4 w-4' />}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        <main className='flex-1 overflow-y-auto pb-20 md:pb-0'>
          {children}
        </main>

        {/* ── Mobile bottom tab bar < 768px ──────────────────────────────────── */}
        <nav className='md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex items-stretch'
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors min-h-[56px]',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className='h-5 w-5' />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
