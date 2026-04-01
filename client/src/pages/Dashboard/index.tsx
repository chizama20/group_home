import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useHome } from '../../context/HomeContext'
import { useRole } from '../../utils/role'
import { useDashboard } from '../../hooks/useDashboard'
import HomeSwitcherStrip from '../../components/HomeSwitcherStrip'
import AnnouncementBanner from './AnnouncementBanner'
import AnnouncementComposer from './AnnouncementComposer'
import NeedsAttention from './NeedsAttention'
import ManagerStatsBar from './ManagerStatsBar'
import ManagerNeedsAttention from './ManagerNeedsAttention'
import OtherHomesSummary from './OtherHomesSummary'
import UpcomingAppointments from './UpcomingAppointments'
import ShiftTasksSection from './ShiftTasksSection'
import QuickActions from './QuickActions'
import AddAppointmentForm from '../../components/AddAppointmentForm'
import { currentShift } from '../../types/log'

const SHIFT_TIME: Record<string, string> = {
  day:     '07:00–14:59',
  evening: '15:00–22:59',
  night:   '23:00–06:59',
}

function greeting(firstName: string): string {
  const h = new Date().getHours()
  const time = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
  return `Good ${time}, ${firstName}`
}

function initials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export default function DashboardPage() {
  const { user, logout }                  = useAuth()
  const navigate                          = useNavigate()
  const { homeId, selectedHome, homes, isLoading: homeIsLoading } = useHome()
  const { isManagerOrAbove }              = useRole()
  const {
    announcements, appointments, tasks, residents,
    overdueMedCount, unfiledIposCount, openIncidentCount, staffOnShiftCount,
    isShiftActive, isLoading, refresh,
  } = useDashboard(homeId)

  const [showProfile, setShowProfile] = useState(false)
  const [showAddAppt, setShowAddAppt] = useState(false)

  const shift = currentShift()

  // Redirect multi-home managers to home selection screen when no home chosen
  useEffect(() => {
    if (homeIsLoading) return
    if (isManagerOrAbove && homes.length > 1 && !homeId) {
      navigate('/select-home', { replace: true })
    }
  }, [homeIsLoading, isManagerOrAbove, homes.length, homeId, navigate])

  return (
    <div className='pb-24 min-h-screen bg-background'>

      {/* Section A: Header */}
      <div className='bg-card px-4 pt-10 pb-4 border-b border-border'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-xl font-bold text-foreground'>
              {user ? greeting(user.first_name) : 'Dashboard'}
            </h1>
            {selectedHome && (
              <p className='text-sm text-muted-foreground mt-0.5'>{selectedHome.name}</p>
            )}
          </div>
          <button
            onClick={() => setShowProfile(true)}
            aria-label='Profile'
            className='w-11 h-11 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0'
          >
            {user ? initials(user.first_name, user.last_name) : '?'}
          </button>
        </div>
      </div>

      {/* Home Switcher Strip (multi-home only) */}
      <HomeSwitcherStrip />

      {/* Manager: Stats Bar */}
      {isManagerOrAbove && (
        <ManagerStatsBar
          residentCount={residents.length}
          overdueMedCount={overdueMedCount}
          unfiledIposCount={unfiledIposCount}
        />
      )}

      {/* Section B: Shift Strip */}
      <div className='mx-4 mt-4 bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between'>
        <div>
          <p className='text-sm font-semibold text-foreground capitalize'>{shift} Shift</p>
          <p className='text-xs text-muted-foreground mt-0.5'>{SHIFT_TIME[shift]}</p>
        </div>
        {isShiftActive && (
          <span className='text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full'>
            Active
          </span>
        )}
      </div>

      {/* Section C: Announcements */}
      <AnnouncementBanner announcements={announcements} />

      {/* Manager: Announcement Composer (between From Management and Needs Attention) */}
      {isManagerOrAbove && homeId && (
        <AnnouncementComposer homeId={homeId} onPosted={refresh} />
      )}

      {/* Section D: Needs Attention */}
      {isManagerOrAbove ? (
        <ManagerNeedsAttention
          openIncidentCount={openIncidentCount}
          unfiledIposCount={unfiledIposCount}
          staffOnShiftCount={staffOnShiftCount}
        />
      ) : (
        <NeedsAttention
          overdueMedCount={overdueMedCount}
          unfiledIposCount={unfiledIposCount}
        />
      )}

      {/* Section E: Appointments */}
      <UpcomingAppointments
        appointments={appointments}
        onAddAppointment={() => setShowAddAppt(true)}
      />

      {/* Section F: Shift Tasks */}
      {user && (
        <ShiftTasksSection
          tasks={tasks}
          currentUserId={user.id}
          onRefresh={refresh}
        />
      )}

      {/* Section G: Quick Actions */}
      <QuickActions />

      {/* Manager: Other Homes (multi-home only) */}
      {isManagerOrAbove && <OtherHomesSummary />}

      {isLoading && !announcements.length && (
        <div className='flex justify-center mt-10'>
          <div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' />
        </div>
      )}

      {/* Profile Sheet */}
      {showProfile && (
        <>
          <div
            className='fixed inset-0 bg-black/40 z-40'
            onClick={() => setShowProfile(false)}
          />
          <div className='fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl z-50'>
            <div className='w-12 h-1 bg-muted rounded-full mx-auto mt-3' />
            <div className='px-4 pt-4 pb-8'>
              {/* User info */}
              <div className='flex items-center gap-3 pb-4 border-b border-border'>
                <div className='w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0'>
                  {user ? initials(user.first_name, user.last_name) : '?'}
                </div>
                <div>
                  <p className='font-semibold text-foreground'>
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className='text-sm text-muted-foreground capitalize mt-0.5'>
                    {user?.role.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Home info */}
              {selectedHome && (
                <div className='py-4 border-b border-border'>
                  <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1'>Home</p>
                  <p className='text-sm font-medium text-foreground'>{selectedHome.name}</p>
                  {selectedHome.address && (
                    <p className='text-xs text-muted-foreground mt-0.5'>{selectedHome.address}</p>
                  )}
                  <p className='text-xs text-muted-foreground capitalize mt-1'>{shift} shift · {SHIFT_TIME[shift]}</p>
                </div>
              )}

              {/* Logout */}
              <button
                onClick={() => {
                  setShowProfile(false)
                  logout()
                  navigate('/login', { replace: true })
                }}
                className='mt-4 w-full text-red-600 border border-red-200 rounded-xl py-3 text-sm font-semibold min-h-[44px]'
              >
                Log out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Appointment Sheet */}
      {showAddAppt && homeId && (
        <AddAppointmentForm
          homeId={homeId}
          residents={residents}
          onSuccess={() => { setShowAddAppt(false); refresh() }}
          onCancel={() => setShowAddAppt(false)}
        />
      )}
    </div>
  )
}
