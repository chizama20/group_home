import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HomeProvider } from './context/HomeContext'
import ProtectedRoute  from './components/ProtectedRoute'
import ManagerRoute    from './components/ManagerRoute'

import LoginPage          from './pages/Login/index'
import DashboardPage      from './pages/Dashboard/index'
import ResidentsPage      from './pages/Residents/index'
import ResidentProfile    from './pages/Residents/ResidentProfile'
import LogsPage           from './pages/Logs/index'
import MedicationsPage    from './pages/Medications/index'
import ShiftPage          from './pages/Shift/index'
import HomeSelectionPage  from './pages/HomeSelection/index'

export default function App() {
  return (
    <AuthProvider>
      <HomeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path='/login' element={<LoginPage />} />

            {/* Employee and above */}
            <Route path='/' element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path='/residents' element={
              <ProtectedRoute><ResidentsPage /></ProtectedRoute>
            } />
            <Route path='/residents/:id' element={
              <ProtectedRoute><ResidentProfile /></ProtectedRoute>
            } />
            <Route path='/logs' element={
              <ProtectedRoute><LogsPage /></ProtectedRoute>
            } />
            <Route path='/medications' element={
              <ProtectedRoute><MedicationsPage /></ProtectedRoute>
            } />
            <Route path='/shift' element={
              <ProtectedRoute><ShiftPage /></ProtectedRoute>
            } />

            {/* Manager: home selection (multi-home only) */}
            <Route path='/select-home' element={
              <ManagerRoute><HomeSelectionPage /></ManagerRoute>
            } />
          </Routes>
        </BrowserRouter>
      </HomeProvider>
    </AuthProvider>
  )
}
