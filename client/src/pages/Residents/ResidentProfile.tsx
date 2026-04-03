import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Pencil, Archive } from 'lucide-react'
import type { Resident } from '../../types/resident'
import { getResident } from '../../api/residents'
import { useRole } from '../../utils/role'
import BottomNav from '../../components/BottomNav'
import { cn } from '../../lib/cn'
import AddAppointmentForm from '../../components/AddAppointmentForm'
import ResidentForm   from './ResidentForm'
import InfoTab         from './tabs/InfoTab'
import MedicationsTab  from './tabs/MedicationsTab'
import LogsTab         from './tabs/LogsTab'
import AppointmentsTab from './tabs/AppointmentsTab'
import IncidentsTab    from './tabs/IncidentsTab'

const TABS = ['info', 'meds', 'logs', 'appointments', 'incidents'] as const
type Tab = typeof TABS[number]

const TAB_LABELS: Record<Tab, string> = {
  info:         'Overview',
  meds:         'Meds',
  logs:         'Logs',
  appointments: 'Appointments',
  incidents:    'Incidents',
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export default function ResidentProfile() {
  const { id }                        = useParams<{ id: string }>()
  const navigate                      = useNavigate()
  const { isOrgAdmin }                = useRole()

  const [resident, setResident]       = useState<Resident | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [tab, setTab]                 = useState<Tab>('info')
  const [showEdit, setShowEdit]       = useState(false)
  const [showAddAppt, setShowAddAppt] = useState(false)
  const [apptKey, setApptKey]         = useState(0)

  const fetchResident = useCallback(() => {
    if (!id) return
    getResident(id)
      .then(res => setResident(res.data.data ?? null))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchResident() }, [fetchResident])

  if (loading) return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center min-h-[200px]'>
      <div className='w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
    </div>
  )
  if (error) return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400'>
      {error}
    </div>
  )
  if (!resident) return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400'>
      Resident not found
    </div>
  )

  const initials = getInitials(resident.first_name, resident.last_name)

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black pb-8'>

      {/* Back button */}
      <div className='flex items-center gap-2 px-4 pt-5 pb-3'>
        <button
          onClick={() => navigate(-1)}
          className='flex items-center gap-1 min-h-[44px]'
          aria-label='Back to residents'
        >
          <ChevronLeft className='h-5 w-5 text-zinc-500' />
          <span className='text-sm text-zinc-500 dark:text-zinc-400 font-medium'>Residents</span>
        </button>
      </div>

      {/* Resident name */}
      <h1 className='text-xl font-bold text-zinc-900 dark:text-white px-4'>
        {resident.first_name} {resident.last_name}
      </h1>

      {/* Status badge */}
      <div className='px-4 mt-1'>
        {resident.is_active ? (
          <span className='inline-flex bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full'>
            Active
          </span>
        ) : (
          <span className='inline-flex bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-[11px] font-semibold px-2.5 py-0.5 rounded-full'>
            Inactive
          </span>
        )}
      </div>

      {/* Room */}
      {resident.room && (
        <p className='text-[13px] text-zinc-500 dark:text-zinc-400 px-4 mt-0.5'>
          Room {resident.room}
        </p>
      )}

      {/* Avatar */}
      <div className='mx-auto mt-4 w-20 h-20 rounded-full bg-indigo-500/15 text-indigo-400 text-2xl font-bold flex items-center justify-center'>
        {initials}
      </div>

      {/* Action buttons — org_admin only */}
      {isOrgAdmin && (
        <div className='flex gap-2 justify-center px-4 mt-4'>
          <button
            onClick={() => setShowEdit(true)}
            className='flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl min-h-[40px]'
          >
            <Pencil className='h-4 w-4' />
            Edit
          </button>
          <button
            onClick={() => {/* archive handled inside InfoTab */}}
            className='flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/40 text-red-500 text-sm font-medium px-4 py-2 rounded-xl min-h-[40px]'
          >
            <Archive className='h-4 w-4' />
            Archive
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div
        className='flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 mt-5 overflow-x-auto'
        style={{ scrollbarWidth: 'none' }}
      >
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px]',
              tab === t
                ? 'border-indigo-500 text-zinc-900 dark:text-white'
                : 'border-transparent text-zinc-500'
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info'         && <InfoTab resident={resident} onRefresh={fetchResident} />}
      {tab === 'meds'         && <MedicationsTab residentId={resident.id} />}
      {tab === 'logs'         && <LogsTab residentId={resident.id} />}
      {tab === 'appointments' && (
        <AppointmentsTab
          key={apptKey}
          residentId={resident.id}
          onAddAppointment={() => setShowAddAppt(true)}
        />
      )}
      {tab === 'incidents' && (
        <IncidentsTab residentId={resident.id} homeId={resident.home_id} />
      )}

      <BottomNav />

      {/* Edit resident form */}
      {showEdit && (
        <ResidentForm
          resident={resident}
          onSuccess={() => { setShowEdit(false); fetchResident() }}
          onCancel={() => setShowEdit(false)}
        />
      )}

      {/* Add appointment form */}
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
