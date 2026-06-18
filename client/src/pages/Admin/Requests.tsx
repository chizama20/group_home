import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrgRequests, approveOrgRequest, rejectOrgRequest, type OrgRequest } from '../../api/admin'
import AdminLayout from './AdminLayout'
import { cn } from '../../lib/cn'

const FACILITY_LABELS: Record<string, string> = {
  group_home:       'Group Home',
  assisted_living:  'Assisted Living',
  foster_care:      'Foster Care',
  supported_living: 'Supported Living',
  day_program:      'Day Program',
  other:            'Other',
}

export default function AdminRequests() {
  const [requests, setRequests]   = useState<OrgRequest[]>([])
  const [filter, setFilter]       = useState<'pending' | 'all'>('pending')
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    getOrgRequests(filter)
      .then(res => { if (res.data.success && res.data.data) setRequests(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  async function handleApprove(id: string) {
    setActing(id)
    setActionError(null)
    try { await approveOrgRequest(id); load() }
    catch { setActionError('Failed to approve request. Please try again.') }
    finally { setActing(null) }
  }

  async function handleReject(id: string) {
    const reason = window.prompt('Rejection reason (optional):') ?? ''
    setActing(id)
    setActionError(null)
    try { await rejectOrgRequest(id, reason || undefined); load() }
    catch { setActionError('Failed to reject request. Please try again.') }
    finally { setActing(null) }
  }

  return (
    <AdminLayout>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-zinc-900 dark:text-white'>Org Requests</h1>
        <div className='flex gap-2'>
          {(['pending', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              )}>
              {f === 'pending' ? 'Pending' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg mb-4'>
          {actionError}
        </p>
      )}

      <div className='bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden'>
        {loading ? (
          <div className='p-8 text-center text-sm text-zinc-400 dark:text-zinc-500'>Loading…</div>
        ) : requests.length === 0 ? (
          <div className='p-8 text-center text-sm text-zinc-400 dark:text-zinc-500'>No requests.</div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-zinc-50 dark:bg-zinc-800/50 text-left text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide'>
                  <th className='px-4 py-3 font-medium'>Organisation</th>
                  <th className='px-4 py-3 font-medium'>Type</th>
                  <th className='px-4 py-3 font-medium'>Contact</th>
                  <th className='px-4 py-3 font-medium'>State</th>
                  <th className='px-4 py-3 font-medium'>Status</th>
                  <th className='px-4 py-3 font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-zinc-100 dark:divide-zinc-800'>
                {requests.map(req => (
                  <tr key={req.id} className='hover:bg-zinc-50 dark:hover:bg-zinc-800/40'>
                    <td className='px-4 py-3'>
                      <Link to={`/admin/requests/${req.id}`} className='font-medium text-primary dark:text-primary hover:underline'>
                        {req.org_name}
                      </Link>
                      <p className='text-xs text-zinc-400 dark:text-zinc-500'>{new Date(req.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className='px-4 py-3'>
                      <span className='bg-primary/10 text-primary dark:text-primary text-xs px-2 py-0.5 rounded-full'>
                        {FACILITY_LABELS[req.facility_type] ?? req.facility_type}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <p className='text-zinc-900 dark:text-white'>{req.contact_name}</p>
                      <p className='text-xs text-zinc-400 dark:text-zinc-500'>{req.contact_email}</p>
                    </td>
                    <td className='px-4 py-3 text-zinc-600 dark:text-zinc-400'>{req.state}</td>
                    <td className='px-4 py-3'>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        req.status === 'pending'  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                    'bg-red-500/10 text-red-600 dark:text-red-400'
                      )}>
                        {req.status}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      {req.status === 'pending' && (
                        <div className='flex gap-2'>
                          <button
                            disabled={acting === req.id}
                            onClick={() => { void handleApprove(req.id) }}
                            className='text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors'>
                            Approve
                          </button>
                          <button
                            disabled={acting === req.id}
                            onClick={() => { void handleReject(req.id) }}
                            className='text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors'>
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
