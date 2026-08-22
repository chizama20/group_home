import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home,
  Building2,
  ClipboardList,
  User,
  Lock,
  Fingerprint,
  Bell,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
  FileText,
  Shield,
  ShieldCheck,
} from 'lucide-react'
import { getTheme, toggleTheme } from '@/lib/theme'
import { useAuth } from '@/context/AuthContext'
import { useHome } from '@/context/HomeContext'
import { useRole } from '@/utils/role'
import EditProfileSheet from '@/components/EditProfileSheet'
import ChangePasswordSheet from '@/components/ChangePasswordSheet'
import NotificationPrefsSheet from '@/components/NotificationPrefsSheet'

// ---------------------------------------------------------------------------
// Sub-item row inside a collapsible section
// ---------------------------------------------------------------------------

interface SubItemProps {
  icon: React.ReactNode
  chipColor: string
  label: string
  value?: string
  valueColor?: string
  badge?: React.ReactNode
  isFirst?: boolean
  onClick?: () => void
}

function SubItem({ icon, chipColor, label, value, valueColor, badge, isFirst, onClick }: SubItemProps) {
  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3.5 min-h-[52px] bg-white dark:bg-zinc-900',
        !isFirst ? 'border-t border-zinc-100 dark:border-zinc-800' : '',
        onClick ? 'cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      {/* Icon chip */}
      <span className={`w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 ${chipColor}`}>
        <span className='h-4 w-4 flex items-center justify-center'>{icon}</span>
      </span>

      {/* Label */}
      <span className='text-sm text-zinc-900 dark:text-white flex-1'>{label}</span>

      {/* Right side */}
      {badge}
      {value !== undefined && (
        <span className={`text-sm ${valueColor ?? 'text-zinc-500 dark:text-zinc-400'}`}>{value}</span>
      )}
      {onClick && <ChevronRight className='h-4 w-4 text-zinc-400 dark:text-zinc-600 ml-1' />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className='mt-5 mx-4'>
      {/* Section header */}
      <button
        type='button'
        className='w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/60 transition-colors'
        style={{ borderBottomLeftRadius: open ? 0 : undefined, borderBottomRightRadius: open ? 0 : undefined }}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className='text-sm font-semibold text-zinc-900 dark:text-white'>{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded sub-items */}
      {open && (
        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-t-0 rounded-b-lg overflow-hidden'>
          {children}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// "Coming soon" — a no-op click handler for placeholder items
// ---------------------------------------------------------------------------

function usePlaceholder() {
  // Returns a stable click handler that does nothing visible
  // (placeholder items intentionally have no destination yet)
  return useCallback(() => {}, [])
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { user, org, logout } = useAuth()
  const { homes } = useHome()
  const { isAdmin } = useRole()
  const navigate = useNavigate()
  const [theme, setThemeState] = useState(getTheme)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false)
  const noOp = usePlaceholder()

  function handleThemeToggle() {
    const next = toggleTheme()
    setThemeState(next)
  }

  // Avatar colour by role
  const avatarColor =
    user?.role === 'admin'
      ? 'bg-amber-500/20 text-amber-400'
      : 'bg-zinc-700 text-zinc-300'

  // Role badge
  const roleBadge =
    user?.role === 'admin' ? (
      <span className='border border-amber-500/30 text-amber-400/70 text-[10px] font-medium px-2 py-0.5 rounded-full'>
        Admin
      </span>
    ) : (
      <span className='border border-zinc-600/40 text-zinc-400 text-[10px] font-medium px-2 py-0.5 rounded-full'>
        Staff
      </span>
    )

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-8'>
      <div className='max-w-4xl mx-auto'>
        {/* Page header */}
        <div className='px-4 pt-5 pb-2'>
          <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Settings</h1>
        </div>

        {/* Profile card */}
        <div className='mx-4 mb-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg'>
          <div className='flex items-center gap-3 p-4'>
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${avatarColor}`}
            >
              {initials}
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold text-zinc-900 dark:text-white leading-tight'>
                {user?.first_name} {user?.last_name}
              </p>
              <div className='mt-1'>{roleBadge}</div>
            </div>
            <ChevronRight className='h-5 w-5 text-zinc-400 dark:text-zinc-600 shrink-0' />
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* My Account — all roles                                           */}
        {/* ---------------------------------------------------------------- */}
        <CollapsibleSection title='My Account' defaultOpen>
          <SubItem
            isFirst
            icon={<User className='h-4 w-4' />}
            chipColor='bg-zinc-500/20 text-zinc-400'
            label='Edit Profile'
            onClick={() => setShowEditProfile(true)}
          />
          <SubItem
            icon={<Lock className='h-4 w-4' />}
            chipColor='bg-zinc-500/20 text-zinc-400'
            label='Change Password'
            onClick={() => setShowChangePassword(true)}
          />
          <SubItem
            icon={<Fingerprint className='h-4 w-4' />}
            chipColor='bg-primary/10 text-primary'
            label={user?.pin_set_at ? 'Change PIN' : 'Signing PIN'}
            value={user?.pin_set_at ? 'Set' : undefined}
            valueColor='text-emerald-400'
            onClick={() => navigate('/setup-pin')}
          />
        </CollapsibleSection>

        {/* ---------------------------------------------------------------- */}
        {/* Organization — admin only                                        */}
        {/* ---------------------------------------------------------------- */}
        {isAdmin && (
          <CollapsibleSection title='Organization'>
            <SubItem
              isFirst
              icon={<Building2 className='h-4 w-4' />}
              chipColor='bg-amber-500/20 text-amber-400'
              label='Org Settings'
              value={org?.name ?? '—'}
            />
            <SubItem
              icon={<Home className='h-4 w-4' />}
              chipColor='bg-primary/10 text-primary'
              label='Manage Homes'
              value={`${homes.length} home${homes.length !== 1 ? 's' : ''}`}
              onClick={() => navigate('/homes')}
            />
            <SubItem
              icon={<ClipboardList className='h-4 w-4' />}
              chipColor='bg-primary/10 text-primary'
              label='Audit Logs'
              onClick={() => navigate('/settings/audit-log')}
            />
          </CollapsibleSection>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Preferences — all roles                                          */}
        {/* ---------------------------------------------------------------- */}
        <CollapsibleSection title='Preferences'>
          <SubItem
            isFirst
            icon={theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
            chipColor='bg-zinc-500/20 text-zinc-400'
            label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            onClick={handleThemeToggle}
          />
          <SubItem
            icon={<Bell className='h-4 w-4' />}
            chipColor='bg-zinc-500/20 text-zinc-400'
            label='Notifications'
            onClick={() => setShowNotificationPrefs(true)}
          />
        </CollapsibleSection>

        {/* ---------------------------------------------------------------- */}
        {/* Legal — all roles                                                */}
        {/* ---------------------------------------------------------------- */}
        <CollapsibleSection title='Legal'>
          <SubItem
            isFirst
            icon={<FileText className='h-4 w-4' />}
            chipColor='bg-zinc-500/20 text-zinc-400'
            label='Terms of Service'
            badge={
              <span className='text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full'>
                Coming soon
              </span>
            }
            onClick={noOp}
          />
          <SubItem
            icon={<Shield className='h-4 w-4' />}
            chipColor='bg-zinc-500/20 text-zinc-400'
            label='Privacy Policy'
            badge={
              <span className='text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full'>
                Coming soon
              </span>
            }
            onClick={noOp}
          />
          {isAdmin && (
            <SubItem
              icon={<ShieldCheck className='h-4 w-4' />}
              chipColor='bg-emerald-500/20 text-emerald-400'
              label='BAA Agreement'
              value='Signed'
              valueColor='text-emerald-400'
            />
          )}
        </CollapsibleSection>

        {/* ---------------------------------------------------------------- */}
        {/* Log Out                                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className='mx-4 mt-5 mb-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'>
          <button
            type='button'
            className='w-full flex items-center justify-center px-4 py-4 min-h-[52px] cursor-pointer active:bg-red-50 dark:active:bg-red-500/5'
            onClick={handleLogout}
          >
            <span className='text-base font-medium text-red-500'>Log Out</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Sheet */}
      {showEditProfile && (
        <EditProfileSheet
          onSuccess={() => setShowEditProfile(false)}
          onCancel={() => setShowEditProfile(false)}
        />
      )}

      {/* Change Password Sheet */}
      {showChangePassword && (
        <ChangePasswordSheet
          onSuccess={() => setShowChangePassword(false)}
          onCancel={() => setShowChangePassword(false)}
        />
      )}

      {/* Notification Prefs Sheet */}
      {showNotificationPrefs && (
        <NotificationPrefsSheet
          onSuccess={() => setShowNotificationPrefs(false)}
          onCancel={() => setShowNotificationPrefs(false)}
        />
      )}
    </div>
  )
}
