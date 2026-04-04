import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth }    from './context/AuthContext'
import { HomeProvider }             from './context/HomeContext'
import ProtectedRoute               from './components/ProtectedRoute'
import ManagerRoute                 from './components/ManagerRoute'
import AppLayout                    from './components/AppLayout'
import SessionWarningModal          from './components/SessionWarningModal'
import { useInactivityTimer }       from './hooks/useInactivityTimer'
import ErrorBoundary                from './components/ErrorBoundary'

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
import CalendarPage       from './pages/Calendar/index'
import SettingsPage       from './pages/Settings/index'
import HomeSelectionPage  from './pages/HomeSelection/index'
import AdminLoginPage     from './pages/Admin/Login'
import AdminDashboard     from './pages/Admin/Dashboard'
import AdminRequests      from './pages/Admin/Requests'
import AdminRequestDetail from './pages/Admin/RequestDetail'
import AdminOrgs          from './pages/Admin/Orgs'
import AdminRoute         from './components/AdminRoute'

function AppRoutes() {
  const { user, logout }              = useAuth()
  const navigate                      = useNavigate()
  const [showWarning, setShowWarning] = useState(false)

  const handleWarning      = useCallback(() => setShowWarning(true), [])
  const handleAutoLogout   = useCallback(() => {
    setShowWarning(false)
    void logout().then(() => navigate('/login?reason=timeout', { replace: true }))
  }, [logout, navigate])
  const handleStayLoggedIn = useCallback(() => setShowWarning(false), [])

  useInactivityTimer({
    enabled:   !!user,
    onWarning: handleWarning,
    onLogout:  handleAutoLogout,
  })

  return (
    <>
      <SessionWarningModal
        open={showWarning}
        onStayLoggedIn={handleStayLoggedIn}
        onLogoutNow={handleAutoLogout}
      />

      <Routes>
        {/* ── Public ───────────────────────────────────────────────────────── */}
        <Route path='/login'                 element={<LoginPage />} />
        <Route path='/forgot-password'       element={<ForgotPasswordPage />} />
        <Route path='/reset-password/:token' element={<ResetPasswordPage />} />
        <Route path='/invite/:token'         element={<InviteAcceptPage />} />
        <Route path='/request-access'        element={<RequestAccessPage />} />

        {/* ── PIN setup (protected, outside layout) ────────────────────────── */}
        <Route path='/setup-pin' element={
          <ProtectedRoute><SetupPinPage /></ProtectedRoute>
        } />

        {/* ── Admin (separate session, no layout) ──────────────────────────── */}
        <Route path='/admin/login'        element={<AdminLoginPage />} />
        <Route path='/admin/dashboard'    element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path='/admin/requests'     element={<AdminRoute><AdminRequests /></AdminRoute>} />
        <Route path='/admin/requests/:id' element={<AdminRoute><AdminRequestDetail /></AdminRoute>} />
        <Route path='/admin/orgs'         element={<AdminRoute><AdminOrgs /></AdminRoute>} />

        {/* ── App (inside AppLayout) ───────────────────────────────────────── */}
        <Route path='/' element={
          <ProtectedRoute>
            <AppLayout><DashboardPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path='/residents' element={
          <ProtectedRoute>
            <AppLayout><ResidentsPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path='/residents/:id' element={
          <ProtectedRoute>
            <AppLayout><ResidentProfile /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path='/logs' element={
          <ProtectedRoute>
            <AppLayout><LogsPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path='/calendar' element={
          <ProtectedRoute>
            <AppLayout><CalendarPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path='/settings' element={
          <ProtectedRoute>
            <AppLayout><SettingsPage /></AppLayout>
          </ProtectedRoute>
        } />

        {/* ── Manager only ─────────────────────────────────────────────────── */}
        <Route path='/select-home' element={
          <ManagerRoute>
            <AppLayout><HomeSelectionPage /></AppLayout>
          </ManagerRoute>
        } />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HomeProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </HomeProvider>
    </AuthProvider>
  )
}
