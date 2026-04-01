import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getOrgRequests, type OrgRequest } from '../../api/admin'
import { Skeleton } from '../../components/ui/skeleton'
import AdminLayout from './AdminLayout'

export default function AdminDashboard() {
  const [pending, setPending] = useState<OrgRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrgRequests('pending')
      .then(res => { if (res.data.success && res.data.data) setPending(res.data.data) })
      .catch(() => toast.error('Failed to load pending requests'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <h1 className='text-2xl font-bold text-foreground mb-6'>Dashboard</h1>

      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8'>
        <div className='bg-card rounded-xl border border-border p-5'>
          <p className='text-sm text-muted-foreground mb-1'>Pending requests</p>
          {loading
            ? <Skeleton className='h-9 w-16 mt-1' />
            : <p className='text-3xl font-bold text-amber-600'>{pending.length}</p>
          }
          <Link to='/admin/requests' className='text-xs text-primary hover:underline mt-2 block'>
            Review →
          </Link>
        </div>
      </div>

      {!loading && pending.length === 0 && (
        <div className='bg-card rounded-xl border border-border p-8 text-center'>
          <p className='text-sm font-medium text-foreground'>All caught up</p>
          <p className='text-xs text-muted-foreground mt-1'>No pending access requests.</p>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <div className='bg-card rounded-xl border border-border'>
          <div className='px-5 py-3 border-b border-border'>
            <h2 className='text-sm font-semibold text-foreground'>Pending requests</h2>
          </div>
          <div className='divide-y divide-border'>
            {pending.slice(0, 5).map(req => (
              <div key={req.id} className='px-5 py-3 flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-foreground'>{req.org_name}</p>
                  <p className='text-xs text-muted-foreground'>{req.contact_email} · {req.facility_type.replace('_', ' ')}</p>
                </div>
                <Link to={`/admin/requests/${req.id}`} className='text-xs text-primary hover:underline'>
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
