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
      <h1 className='text-2xl font-bold text-gray-900 mb-6'>Dashboard</h1>

      <div className='grid grid-cols-3 gap-4 mb-8'>
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <p className='text-sm text-gray-500 mb-1'>Pending requests</p>
          <p className='text-3xl font-bold text-amber-600'>
            {loading ? '—' : pending.length}
          </p>
          <Link to='/admin/requests' className='text-xs text-blue-600 hover:underline mt-2 block'>
            Review →
          </Link>
        </div>
      </div>

      {!loading && pending.length > 0 && (
        <div className='bg-white rounded-xl border border-gray-200'>
          <div className='px-5 py-3 border-b border-gray-100'>
            <h2 className='text-sm font-semibold text-gray-700'>Pending requests</h2>
          </div>
          <div className='divide-y divide-gray-100'>
            {pending.slice(0, 5).map(req => (
              <div key={req.id} className='px-5 py-3 flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-900'>{req.org_name}</p>
                  <p className='text-xs text-gray-500'>{req.contact_email} · {req.facility_type.replace('_', ' ')}</p>
                </div>
                <Link to={`/admin/requests/${req.id}`}
                  className='text-xs text-blue-600 hover:underline'>
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
