import { useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  UserPlus,
  Building2,
  ClipboardList,
  Download,
  FileCheck,
  User,
  Lock,
  Fingerprint,
  Bell,
  ChevronRight,
  Moon,
  Sun,
  FileText,
  Shield,
} from 'lucide-react'
import { getTheme, toggleTheme } from '@/lib/theme'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHome } from '@/context/HomeContext'
import { useRole } from '@/utils/role'
import InviteStaffWizard from '@/components/InviteStaffWizard'
import EditProfileSheet from '@/components/EditProfileSheet'
import ChangePasswordSheet from '@/components/ChangePasswordSheet'

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='mt-5'>
      <p className='px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
        {label}
      </p>
      <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden'>
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------
interface RowProps {
  icon: React.ReactNode
  chipColor: string
  label: string
  value?: string
  valueColor?: string
  badge?: React.ReactNode
  isFirst?: boolean
  onClick?: () => void
}

function SettingsRow({
  icon,
  chipColor,
  label,
  value,
  valueColor,
  badge,
  isFirst,
  onClick,
}: RowProps) {
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
      <span
        className={`w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 ${chipColor}`}
      >
        <span className='h-4 w-4 flex items-center justify-center'>{icon}</span>
      </span>

      {/* Label */}
      <span className='text-sm text-zinc-900 dark:text-white flex-1'>{label}</span>

      {/* Optional right-side elements */}
      {badge}
      {value !== undefined && (
        <span className={`text-sm ${valueColor ?? 'text-zinc-500 dark:text-zinc-400'}`}>
          {value}
        </span>
      )}
      {onClick && (
        <ChevronRight className='h-4 w-4 text-zinc-400 dark:text-zinc-600 ml-1' />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { user, org, logout } = useAuth()
  const { homes } = useHome()
  const { isOrgAdmin, isManagerOrAbove } = useRole()
  const navigate = useNavigate()
  const [theme, setThemeState] = useState(getTheme)
  const [showInviteWizard, setShowInviteWizard] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  function handleThemeToggle() {
    const next = toggleTheme()
    setThemeState(next)
  }

  // Avatar colour by role
  const avatarColor =
    user?.role === 'org_admin'
      ? 'bg-amber-500/20 text-amber-400'
      : user?.role === 'manager'
        ? 'bg-violet-500/20 text-violet-400'
        : 'bg-zinc-700 text-zinc-300'

  // Role badge
  const roleBadge =
    user?.role === 'org_admin' ? (
      <span className='bg-amber-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full'>
        Org Admin
      </span>
    ) : user?.role === 'manager' ? (
      <span className='bg-violet-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full'>
        Manager
      </span>
    ) : (
      <span className='bg-zinc-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full'>
        Employee
      </span>
    )

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black pb-8'>
      <div className='max-w-4xl mx-auto'>
      {/* Page header */}
      <div className='px-4 pt-5 pb-2'>
        <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Settings</h1>
      </div>

      {/* Profile card */}
      <div className='mx-4 mb-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl'>
        <div className='flex items-center gap-3 p-4'>
          {/* Avatar */}
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${avatarColor}`}
          >
            {initials}
          </div>

          {/* Name + badge */}
          <div className='flex-1 min-w-0'>
            <p className='text-[15px] font-semibold text-zinc-900 dark:text-white leading-tight'>
              {user?.first_name} {user?.last_name}
            </p>
            <div className='mt-1'>{roleBadge}</div>
          </div>

          {/* Chevron affordance */}
          <ChevronRight className='h-5 w-5 text-zinc-400 dark:text-zinc-600 shrink-0' />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ORG ADMIN sections                                                  */}
      {/* ------------------------------------------------------------------ */}
      {isOrgAdmin && (
        <>
          <Section label='PROFILE'>
            <SettingsRow
              isFirst
              icon={<User className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label='Edit Profile'
              onClick={() => setShowEditProfile(true)}
            />
            <SettingsRow
              icon={<Lock className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label='Change Password'
              onClick={() => setShowChangePassword(true)}
            />
            <SettingsRow
              icon={<Fingerprint className='h-4 w-4' />}
              chipColor='bg-indigo-500/20 text-indigo-400'
              label='Signing PIN'
              value='Set'
              valueColor='text-emerald-400'
              onClick={() => navigate('/setup-pin')}
            />
          </Section>

          <Section label='ORGANIZATION'>
            <SettingsRow
              isFirst
              icon={<Building2 className='h-4 w-4' />}
              chipColor='bg-amber-500/20 text-amber-400'
              label='Org Settings'
              value={org?.name ?? '—'}
            />
            <SettingsRow
              icon={<Home className='h-4 w-4' />}
              chipColor='bg-indigo-500/20 text-indigo-400'
              label='Manage Homes'
              value={`${homes.length} home${homes.length !== 1 ? 's' : ''}`}
              onClick={() => navigate('/homes')}
            />
            <SettingsRow
              icon={<Users className='h-4 w-4' />}
              chipColor='bg-emerald-500/20 text-emerald-400'
              label='Staff Management'
              value='View & manage'
              onClick={() => navigate('/homes')}
            />
            <SettingsRow
              icon={<UserPlus className='h-4 w-4' />}
              chipColor='bg-violet-500/20 text-violet-400'
              label='Invite New Staff'
              onClick={() => setShowInviteWizard(true)}
            />
          </Section>

          <Section label='DATA & COMPLIANCE'>
            <SettingsRow
              isFirst
              icon={<ClipboardList className='h-4 w-4' />}
              chipColor='bg-indigo-500/20 text-indigo-400'
              label='Audit Logs'
              onClick={() => navigate('/org-logs?tab=audit')}
            />
            <SettingsRow
              icon={<Download className='h-4 w-4' />}
              chipColor='bg-emerald-500/20 text-emerald-400'
              label='Export Records'
              onClick={() => navigate('/org-logs?tab=exports')}
            />
          </Section>

          <Section label='PREFERENCES'>
            <SettingsRow
              isFirst
              icon={theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              onClick={handleThemeToggle}
            />
            <SettingsRow
              icon={<Bell className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label='Notifications'
            />
          </Section>

          <Section label='LEGAL'>
            <SettingsRow
              isFirst
              icon={<FileCheck className='h-4 w-4' />}
              chipColor='bg-emerald-500/20 text-emerald-400'
              label='BAA Agreement'
              value='Signed'
              valueColor='text-emerald-400'
            />
            <SettingsRow
              icon={<FileText className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label='Terms of Service'
            />
            <SettingsRow
              icon={<Shield className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label='Privacy Policy'
            />
          </Section>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MANAGER sections                                                    */}
      {/* ------------------------------------------------------------------ */}
      {isManagerOrAbove && !isOrgAdmin && (
        <>
          <Section label='HOME'>
            <SettingsRow
              isFirst
              icon={<Users className='h-4 w-4' />}
              chipColor='bg-indigo-500/20 text-indigo-400'
              label='Home Staff Roster'
            />
          </Section>

          <Section label='ACCOUNT'>
            <SettingsRow
              isFirst
              icon={<Lock className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label='Change Password'
              onClick={() => setShowChangePassword(true)}
            />
            <SettingsRow
              icon={<Fingerprint className='h-4 w-4' />}
              chipColor='bg-indigo-500/20 text-indigo-400'
              label='Signing PIN'
              value='Set'
              valueColor='text-emerald-400'
              onClick={() => navigate('/setup-pin')}
            />
          </Section>

          <Section label='PREFERENCES'>
            <SettingsRow
              isFirst
              icon={theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              onClick={handleThemeToggle}
            />
            <SettingsRow
              icon={<Bell className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label='Notifications'
            />
          </Section>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* EMPLOYEE sections                                                   */}
      {/* ------------------------------------------------------------------ */}
      {!isManagerOrAbove && (
        <>
          <Section label='ACCOUNT'>
            <SettingsRow
              isFirst
              icon={<User className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label='Edit Profile'
              onClick={() => setShowEditProfile(true)}
            />
            <SettingsRow
              icon={<Lock className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label='Change Password'
              onClick={() => setShowChangePassword(true)}
            />
            <SettingsRow
              icon={<Fingerprint className='h-4 w-4' />}
              chipColor='bg-indigo-500/20 text-indigo-400'
              label='Signing PIN'
              value='Set'
              valueColor='text-emerald-400'
              onClick={() => navigate('/setup-pin')}
            />
          </Section>

          <Section label='PREFERENCES'>
            <SettingsRow
              isFirst
              icon={theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              onClick={handleThemeToggle}
            />
            <SettingsRow
              icon={<Bell className='h-4 w-4' />}
              chipColor='bg-zinc-500/20 text-zinc-400'
              label='Notifications'
            />
          </Section>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Log Out                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className='mx-4 mt-5 mb-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden'>
        <button
          type='button'
          className='w-full flex items-center justify-center px-4 py-4 min-h-[52px] cursor-pointer active:bg-red-50 dark:active:bg-red-500/5'
          onClick={handleLogout}
        >
          <span className='text-base font-medium text-red-500'>Log Out</span>
        </button>
      </div>
      </div>

      {/* Invite Staff Wizard */}
      {showInviteWizard && (
        <InviteStaffWizard
          onSuccess={() => setShowInviteWizard(false)}
          onCancel={() => setShowInviteWizard(false)}
        />
      )}

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
    </div>
  )
}
