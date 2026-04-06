import { useState } from 'react'
import { Download, History, User, FileText, Settings, Shield } from 'lucide-react'
import type { Home } from '../../../api/homes'
import { cn } from '../../../lib/cn'

// Placeholder audit event types
interface AuditEvent {
  id: string
  homeId: string | null
  homeName: string | null
  userId: string
  userName: string
  action: string
  actionType: 'create' | 'update' | 'delete' | 'view' | 'export' | 'login' | 'settings'
  details: string
  timestamp: string
}

// Placeholder data - empty for now
const PLACEHOLDER_EVENTS: AuditEvent[] = []

interface Props {
  selectedHomeId: string
  homes: Home[]
}

export default function AuditTab({ selectedHomeId }: Props) {
  const [exporting, setExporting] = useState(false)

  // Filter events by home
  const filteredEvents = selectedHomeId === 'all'
    ? PLACEHOLDER_EVENTS
    : PLACEHOLDER_EVENTS.filter(e => e.homeId === selectedHomeId || e.homeId === null)

  function getActionIcon(actionType: AuditEvent['actionType']) {
    switch (actionType) {
      case 'create':
        return <FileText size={14} className='text-emerald-500' />
      case 'update':
        return <FileText size={14} className='text-amber-500' />
      case 'delete':
        return <FileText size={14} className='text-red-500' />
      case 'view':
        return <FileText size={14} className='text-blue-500' />
      case 'export':
        return <Download size={14} className='text-indigo-500' />
      case 'login':
        return <User size={14} className='text-zinc-500' />
      case 'settings':
        return <Settings size={14} className='text-zinc-500' />
      default:
        return <Shield size={14} className='text-zinc-400' />
    }
  }

  function formatTimestamp(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  async function handleExportCsv() {
    setExporting(true)
    // Placeholder - would call API to generate CSV
    setTimeout(() => {
      setExporting(false)
      // For now, show alert since there's no real data
      alert('Export CSV feature will be connected to the API')
    }, 1000)
  }

  return (
    <div className='pb-4'>
      {/* Header with export button */}
      <div className='px-4 pt-4 pb-2 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <History size={16} className='text-zinc-400' />
          <h2 className='text-sm font-semibold text-zinc-900 dark:text-white'>
            Audit Trail
          </h2>
        </div>
        <button
          onClick={() => { void handleExportCsv() }}
          disabled={exporting || filteredEvents.length === 0}
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl min-h-[40px] transition-colors',
            'text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50',
            'hover:bg-indigo-50 dark:hover:bg-indigo-500/10',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Download size={14} />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Audit event list */}
      {filteredEvents.length === 0 ? (
        <div className='mx-4 mt-2'>
          <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center'>
            <History size={32} className='text-zinc-300 dark:text-zinc-700 mx-auto mb-2' />
            <p className='text-sm text-zinc-500 dark:text-zinc-400'>
              No audit events recorded
            </p>
            <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
              User actions and system events will appear here
            </p>
          </div>

          {/* Placeholder example to show expected UI */}
          <div className='mt-4 space-y-2'>
            <p className='text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide'>
              Example Layout
            </p>

            <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 opacity-60'>
              {/* Example event 1 */}
              <div className='px-4 py-3 flex items-start gap-3'>
                <div className='w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5'>
                  <FileText size={14} className='text-emerald-500' />
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-baseline gap-2'>
                    <p className='text-sm font-medium text-zinc-900 dark:text-white'>
                      John Smith
                    </p>
                    <span className='text-xs text-zinc-400 dark:text-zinc-500'>
                      Sunshine House
                    </span>
                  </div>
                  <p className='text-sm text-zinc-600 dark:text-zinc-400 mt-0.5'>
                    Created incident report for resident
                  </p>
                  <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
                    Apr 5 at 2:30 PM
                  </p>
                </div>
              </div>

              {/* Example event 2 */}
              <div className='px-4 py-3 flex items-start gap-3'>
                <div className='w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5'>
                  <FileText size={14} className='text-amber-500' />
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-baseline gap-2'>
                    <p className='text-sm font-medium text-zinc-900 dark:text-white'>
                      Jane Doe
                    </p>
                    <span className='text-xs text-zinc-400 dark:text-zinc-500'>
                      Maple Grove
                    </span>
                  </div>
                  <p className='text-sm text-zinc-600 dark:text-zinc-400 mt-0.5'>
                    Updated medication schedule for resident
                  </p>
                  <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
                    Apr 5 at 1:15 PM
                  </p>
                </div>
              </div>

              {/* Example event 3 */}
              <div className='px-4 py-3 flex items-start gap-3'>
                <div className='w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5'>
                  <Download size={14} className='text-indigo-500' />
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-baseline gap-2'>
                    <p className='text-sm font-medium text-zinc-900 dark:text-white'>
                      Admin User
                    </p>
                    <span className='text-xs text-zinc-400 dark:text-zinc-500'>
                      All homes
                    </span>
                  </div>
                  <p className='text-sm text-zinc-600 dark:text-zinc-400 mt-0.5'>
                    Exported IPOS compliance report
                  </p>
                  <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
                    Apr 5 at 11:00 AM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='mx-4 mt-2'>
          <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800'>
            {filteredEvents.map(event => (
              <div key={event.id} className='px-4 py-3 flex items-start gap-3'>
                <div className='w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5'>
                  {getActionIcon(event.actionType)}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-baseline gap-2'>
                    <p className='text-sm font-medium text-zinc-900 dark:text-white'>
                      {event.userName}
                    </p>
                    {event.homeName && (
                      <span className='text-xs text-zinc-400 dark:text-zinc-500'>
                        {event.homeName}
                      </span>
                    )}
                  </div>
                  <p className='text-sm text-zinc-600 dark:text-zinc-400 mt-0.5'>
                    {event.details}
                  </p>
                  <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
                    {formatTimestamp(event.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
