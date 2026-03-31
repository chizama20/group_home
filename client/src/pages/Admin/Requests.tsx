import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrgRequests, approveOrgRequest, rejectOrgRequest, type OrgRequest } from '../../api/admin'
import AdminLayout from './AdminLayout'

const FACILITY_LABELS: Record<string, string> = {
  group_home: 'Group Home', assisted_living: 'Assisted Living', foster_care: 'Foster Care',
  supported_living: 'Supported Living', day_program: 'Day Program', other: 'Other',
}

export default function AdminRequests() {
  const [requests, setRequests] = useState<OrgRequest[]>([])
  const [filter, setFilter]     = useState<'pending' | 'all'>('pending')
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState<string | null>(null)

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
    try {
      await approveOrgRequest(id)
      load()
    } catch { /* handle silently */ }
    finally { setActing(null) }
  }

  async function handleReject(id: string) {
    const reason = window.prompt('Rejection reason (optional):') ?? ''
    setActing(id)
    try {
      await rejectOrgRequest(id, reason || undefined)
      load()
    } catch { /* handle silently */ }
    finally { setActing(null) }
  }

  return (
    <AdminLayout>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Org Requests</h1>
        <div className='flex gap-2'>
          {(['pending', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
              {f === 'pending' ? 'Pending' : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        {loading ? (
          <div className='p-8 text-center text-sm text-gray-400'>Loading…</div>
        ) : requests.length === 0 ? (
          <div className='p-8 text-center text-sm text-gray-400'>No requests.</div>
        ) : (
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide'>
                <th className='px-4 py-3 font-medium'>Organisation</th>
                <th className='px-4 py-3 font-medium'>Type</th>
                <th className='px-4 py-3 font-medium'>Contact</th>
                <th className='px-4 py-3 font-medium'>State</th>
                <th className='px-4 py-3 font-medium'>Status</th>
                <th className='px-4 py-3 font-medium'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {requests.map(req => (
                <tr key={req.id} className='hover:bg-gray-50'>
                  <td className='px-4 py-3'>
                    <Link to={`/admin/requests/${req.id}`} className='font-medium text-blue-600 hover:underline'>
                      {req.org_name}
                    </Link>
                    <p className='text-xs text-gray-400'>{new Date(req.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className='px-4 py-3'>
                    <span className='bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full'>
                      {FACILITY_LABELS[req.facility_type] ?? req.facility_type}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    <p>{req.contact_name}</p>
                    <p className='text-xs text-gray-400'>{req.contact_email}</p>
                  </td>
                  <td className='px-4 py-3 text-gray-600'>{req.state}</td>
                  <td className='px-4 py-3'>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      req.status === 'pending'  ? 'bg-amber-50 text-amber-700' :
                      req.status === 'approved' ? 'bg-green-50 text-green-700' :
                                                  'bg-red-50 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    {req.status === 'pending' && (
                      <div className='flex gap-2'>
                        <button
                          disabled={acting === req.id}
                          onClick={() => { void handleApprove(req.id) }}
                          className='text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50'>
                          Approve
                        </button>
                        <button
                          disabled={acting === req.id}
                          onClick={() => { void handleReject(req.id) }}
                          className='text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50'>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}
