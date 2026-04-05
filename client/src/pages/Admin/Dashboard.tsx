import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrgRequests, type OrgRequest } from '../../api/admin'
import AdminLayout from './AdminLayout'

export default function AdminDashboard() {
  const [pending, setPending] = useState<OrgRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrgRequests('pending')
      .then(res => { if (res.data.success && res.data.data) setPending(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <h1 className='text-2xl font-bold text-zinc-900 dark:text-white mb-6'>Dashboard</h1>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8'>
        <div className='bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5'>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-1'>Pending requests</p>
          <p className='text-3xl font-bold text-amber-600 dark:text-amber-400'>
            {loading ? '—' : pending.length}
          </p>
          <Link to='/admin/requests' className='text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2 block'>
            Review →
          </Link>
        </div>
      </div>

      {!loading && pending.length > 0 && (
        <div className='bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden'>
          <div className='px-5 py-3 border-b border-zinc-100 dark:border-zinc-800'>
            <h2 className='text-sm font-semibold text-zinc-700 dark:text-zinc-300'>Pending requests</h2>
          </div>
          <div className='divide-y divide-zinc-100 dark:divide-zinc-800'>
            {pending.slice(0, 5).map(req => (
              <div key={req.id} className='px-5 py-3 flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-zinc-900 dark:text-white'>{req.org_name}</p>
                  <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                    {req.contact_email} · {req.facility_type.replace('_', ' ')}
                  </p>
                </div>
                <Link to={`/admin/requests/${req.id}`} className='text-xs text-indigo-600 dark:text-indigo-400 hover:underline'>
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
