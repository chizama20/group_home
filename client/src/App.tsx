import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { HomeProvider }          from './context/HomeContext'
import ProtectedRoute            from './components/ProtectedRoute'
import ManagerRoute              from './components/ManagerRoute'
import SessionWarningModal       from './components/SessionWarningModal'
import AppLayout                 from './components/AppLayout'
import { useInactivityTimer }    from './hooks/useInactivityTimer'

import LoginPage          from './pages/Login/index'
import ForgotPasswordPage from './pages/ForgotPassword/index'
import ResetPasswordPage  from './pages/ResetPassword/index'
import InviteAcceptPage   from './pages/InviteAccept/index'
import RequestAccessPage  from './pages/RequestAccess/index'
import SetupPinPage       from './pages/SetupPin/index'
import DashboardPage      from './pages/Dashboard/index'
import ResidentsPage      from './pages/Residents/index'
import ResidentProfile    from './pages/Residents/ResidentProfile'
import LogsPage           from './pages/Logs/index'
import MedicationsPage    from './pages/Medications/index'
import ShiftPage          from './pages/Shift/index'
import HomeSelectionPage  from './pages/HomeSelection/index'
import AdminLoginPage     from './pages/Admin/Login'
import AdminDashboard     from './pages/Admin/Dashboard'
import AdminRequests      from './pages/Admin/Requests'
import AdminRequestDetail from './pages/Admin/RequestDetail'
import AdminOrgs          from './pages/Admin/Orgs'

function WithLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

function AppRoutes() {
  const { user, logout }              = useAuth()
  const navigate                      = useNavigate()
  const [showWarning, setShowWarning] = useState(false)

  const handleWarning = useCallback(() => setShowWarning(true), [])

  const handleAutoLogout = useCallback(() => {
    setShowWarning(false)
    void logout().then(() => navigate('/login?reason=timeout', { replace: true }))
  }, [logout, navigate])

  const handleStayLoggedIn = useCallback(() => setShowWarning(false), [])

  useInactivityTimer({ enabled: !!user, onWarning: handleWarning, onLogout: handleAutoLogout })

  return (
    <>
      <SessionWarningModal open={showWarning} onStayLoggedIn={handleStayLoggedIn} onLogoutNow={handleAutoLogout} />

      <Routes>
        {/* ── Public ────────────────────────────────────────── */}
        <Route path='/login'                 element={<LoginPage />} />
        <Route path='/forgot-password'       element={<ForgotPasswordPage />} />
        <Route path='/reset-password/:token' element={<ResetPasswordPage />} />
        <Route path='/invite/:token'         element={<InviteAcceptPage />} />
        <Route path='/request-access'        element={<RequestAccessPage />} />

        {/* ── PIN setup (auth required, no layout shell) ───── */}
        <Route path='/setup-pin' element={
          <ProtectedRoute><SetupPinPage /></ProtectedRoute>
        } />

        {/* ── App (auth + layout shell) ─────────────────────── */}
        <Route path='/'            element={<WithLayout><DashboardPage /></WithLayout>} />
        <Route path='/residents'   element={<WithLayout><ResidentsPage /></WithLayout>} />
        <Route path='/residents/:id' element={<WithLayout><ResidentProfile /></WithLayout>} />
        <Route path='/logs'        element={<WithLayout><LogsPage /></WithLayout>} />
        <Route path='/medications' element={<WithLayout><MedicationsPage /></WithLayout>} />
        <Route path='/shift'       element={<WithLayout><ShiftPage /></WithLayout>} />

        {/* ── Manager: home selection ───────────────────────── */}
        <Route path='/select-home' element={
          <ManagerRoute><HomeSelectionPage /></ManagerRoute>
        } />

        {/* ── Admin (separate session) ──────────────────────── */}
        <Route path='/admin/login'        element={<AdminLoginPage />} />
        <Route path='/admin/dashboard'    element={<AdminDashboard />} />
        <Route path='/admin/requests'     element={<AdminRequests />} />
        <Route path='/admin/requests/:id' element={<AdminRequestDetail />} />
        <Route path='/admin/orgs'         element={<AdminOrgs />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HomeProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position='top-center'
            toastOptions={{ className: 'md:!bottom-4 md:!top-auto md:!right-4 md:!left-auto' }}
          />
        </BrowserRouter>
      </HomeProvider>
    </AuthProvider>
  )
}
