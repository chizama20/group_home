import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSelectedHome } from '../../hooks/useSelectedHome'
import { useDashboard } from '../../hooks/useDashboard'
import BottomNav from '../../components/BottomNav'
import AnnouncementBanner from './AnnouncementBanner'
import NeedsAttention from './NeedsAttention'
import UpcomingAppointments from './UpcomingAppointments'
import ShiftTasksSection from './ShiftTasksSection'
import QuickActions from './QuickActions'
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
  const { user, logout }       = useAuth()
  const navigate               = useNavigate()
  const { homeId, selectedHome } = useSelectedHome()
  const {
    announcements, appointments, tasks,
    overdueMedCount, unfiledIposCount, isShiftActive,
    isLoading, refresh,
  } = useDashboard(homeId)

  const [showProfile, setShowProfile] = useState(false)
  const [showAddAppt, setShowAddAppt] = useState(false)

  const shift = currentShift()

  return (
    <div className='pb-24 min-h-screen bg-gray-50'>

      {/* Section A: Header */}
      <div className='bg-white px-4 pt-10 pb-4 border-b border-gray-100'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-xl font-bold text-gray-900'>
              {user ? greeting(user.first_name) : 'Dashboard'}
            </h1>
            {selectedHome && (
              <p className='text-sm text-gray-500 mt-0.5'>{selectedHome.name}</p>
            )}
          </div>
          <button
            onClick={() => setShowProfile(true)}
            aria-label='Profile'
            className='w-11 h-11 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0'
          >
            {user ? initials(user.first_name, user.last_name) : '?'}
          </button>
        </div>
      </div>

      {/* Section B: Shift Strip */}
      <div className='mx-4 mt-4 bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between'>
        <div>
          <p className='text-sm font-semibold text-gray-900 capitalize'>{shift} Shift</p>
          <p className='text-xs text-gray-500 mt-0.5'>{SHIFT_TIME[shift]}</p>
        </div>
        {isShiftActive && (
          <span className='text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full'>
            Active
          </span>
        )}
      </div>

      {/* Section C: Announcements */}
      <AnnouncementBanner announcements={announcements} />

      {/* Section D: Needs Attention */}
      <NeedsAttention
        overdueMedCount={overdueMedCount}
        unfiledIposCount={unfiledIposCount}
      />

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

      {isLoading && !announcements.length && (
        <div className='flex justify-center mt-10'>
          <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin' />
        </div>
      )}

      <BottomNav />

      {/* Profile Sheet */}
      {showProfile && (
        <>
          <div
            className='fixed inset-0 bg-black/40 z-40'
            onClick={() => setShowProfile(false)}
          />
          <div className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50'>
            <div className='w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3' />
            <div className='px-4 pt-4 pb-8'>
              {/* User info */}
              <div className='flex items-center gap-3 pb-4 border-b border-gray-100'>
                <div className='w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0'>
                  {user ? initials(user.first_name, user.last_name) : '?'}
                </div>
                <div>
                  <p className='font-semibold text-gray-900'>
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className='text-sm text-gray-500 capitalize mt-0.5'>
                    {user?.role.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Home info */}
              {selectedHome && (
                <div className='py-4 border-b border-gray-100'>
                  <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1'>Home</p>
                  <p className='text-sm font-medium text-gray-900'>{selectedHome.name}</p>
                  {selectedHome.address && (
                    <p className='text-xs text-gray-500 mt-0.5'>{selectedHome.address}</p>
                  )}
                  <p className='text-xs text-gray-400 capitalize mt-1'>{shift} shift · {SHIFT_TIME[shift]}</p>
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

      {/* Add Appointment Sheet — placeholder until Phase 8 */}
      {showAddAppt && (
        <>
          <div
            className='fixed inset-0 bg-black/40 z-40'
            onClick={() => setShowAddAppt(false)}
          />
          <div className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-4 pb-8'>
            <div className='w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4' />
            <p className='text-center text-sm text-gray-500'>
              Add Appointment form — wired in Phase 8
            </p>
            <button
              onClick={() => setShowAddAppt(false)}
              className='mt-4 w-full py-3 bg-gray-100 rounded-xl text-sm text-gray-600 min-h-[44px]'
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  )
}
