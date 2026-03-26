import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Resident } from '../../types/resident'
import { getResident } from '../../api/residents'
import BottomNav from '../../components/BottomNav'
import { cn } from '../../lib/cn'
import AddAppointmentForm from '../../components/AddAppointmentForm'
import InfoTab         from './tabs/InfoTab'
import MedicationsTab  from './tabs/MedicationsTab'
import LogsTab         from './tabs/LogsTab'
import AppointmentsTab from './tabs/AppointmentsTab'
import IncidentsTab    from './tabs/IncidentsTab'

const TABS = ['info', 'meds', 'logs', 'appointments', 'incidents'] as const
type Tab = typeof TABS[number]

const TAB_LABELS: Record<Tab, string> = {
  info:         'Overview',
  meds:         'Medications',
  logs:         'Logs',
  appointments: 'Appointments',
  incidents:    'Incidents',
}

export default function ResidentProfile() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [resident, setResident] = useState<Resident | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [tab, setTab]           = useState<Tab>('info')
  const [showAddAppt, setShowAddAppt]   = useState(false)
  const [apptKey,    setApptKey]        = useState(0)

  useEffect(() => {
    if (!id) return
    getResident(id)
      .then(res => setResident(res.data.data ?? null))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
      <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin' />
    </div>
  )
  if (error)    return <div className='p-4 text-sm text-red-600'>{error}</div>
  if (!resident) return <div className='p-4 text-sm text-gray-500'>Resident not found</div>

  return (
    <div className='pb-20 min-h-screen bg-gray-50'>

      {/* Header */}
      <div className='bg-white px-4 pt-5 pb-0 border-b border-gray-100'>
        <div className='flex items-center gap-3 pb-3'>
          <button
            onClick={() => navigate(-1)}
            className='text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl shrink-0'
            aria-label='Back'
          >
            ←
          </button>
          <div className='flex-1 min-w-0'>
            <h1 className='text-xl font-bold text-gray-900 truncate'>
              {resident.first_name} {resident.last_name}
            </h1>
            {resident.room && (
              <p className='text-sm text-gray-500'>Room {resident.room}</p>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className='flex overflow-x-auto gap-1 pb-0 -mx-1 px-1' style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg min-h-[44px] transition-colors shrink-0',
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'info'         && <InfoTab resident={resident} />}
      {tab === 'meds'         && <MedicationsTab residentId={resident.id} />}
      {tab === 'logs'         && <LogsTab residentId={resident.id} />}
      {tab === 'appointments' && (
        <AppointmentsTab
          key={apptKey}
          residentId={resident.id}
          onAddAppointment={() => setShowAddAppt(true)}
        />
      )}
      {tab === 'incidents'    && (
        <IncidentsTab residentId={resident.id} homeId={resident.home_id} />
      )}

      <BottomNav />

      {showAddAppt && (
        <AddAppointmentForm
          homeId={resident.home_id}
          residentId={resident.id}
          onSuccess={() => {
            setShowAddAppt(false)
            setApptKey(k => k + 1)
            setTab('appointments')
          }}
          onCancel={() => setShowAddAppt(false)}
        />
      )}
    </div>
  )
}
