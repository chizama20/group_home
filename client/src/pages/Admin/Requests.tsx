import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getOrgRequests, approveOrgRequest, rejectOrgRequest, type OrgRequest } from '../../api/admin'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import AdminLayout from './AdminLayout'

const FACILITY_LABELS: Record<string, string> = {
  group_home: 'Group Home', assisted_living: 'Assisted Living', foster_care: 'Foster Care',
  supported_living: 'Supported Living', day_program: 'Day Program', other: 'Other',
}

interface RejectDialogProps {
  requestId: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

function RejectDialog({ requestId: _requestId, onConfirm, onCancel }: RejectDialogProps) {
  const [reason, setReason] = useState('')
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Reject Request</DialogTitle>
        </DialogHeader>
        <p className='text-sm text-muted-foreground mb-4'>Provide an optional reason. The applicant will be notified.</p>
        <textarea
          autoFocus
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder='Rejection reason (optional)…'
          rows={3}
          className='w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30'
        />
        <div className='flex gap-2 mt-4 justify-end'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted'
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className='px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700'
          >
            Reject
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminRequests() {
  const [requests, setRequests] = useState<OrgRequest[]>([])
  const [filter, setFilter]     = useState<'pending' | 'all'>('pending')
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  function load() {
    setLoading(true)
    getOrgRequests(filter)
      .then(res => { if (res.data.success && res.data.data) setRequests(res.data.data) })
      .catch(() => toast.error('Failed to load requests'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  async function handleApprove(id: string) {
    setActing(id)
    try {
      await approveOrgRequest(id)
      toast.success('Request approved')
      load()
    } catch {
      toast.error('Failed to approve request')
    } finally { setActing(null) }
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return
    const id = rejectTarget
    setRejectTarget(null)
    setActing(id)
    try {
      await rejectOrgRequest(id, reason || undefined)
      toast.success('Request rejected')
      load()
    } catch {
      toast.error('Failed to reject request')
    } finally { setActing(null) }
  }

  return (
    <AdminLayout>
      {rejectTarget && (
        <RejectDialog
          requestId={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-foreground'>Org Requests</h1>
        <div className='flex gap-2'>
          {(['pending', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground hover:bg-muted'
              }`}>
              {f === 'pending' ? 'Pending' : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className='bg-card rounded-xl border border-border overflow-hidden'>
        {loading ? (
          <div className='p-8 space-y-3'>
            {[...Array(3)].map((_, i) => (
              <div key={i} className='h-12 bg-muted rounded animate-pulse' />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className='p-12 text-center'>
            <p className='text-sm font-medium text-foreground'>No requests found</p>
            <p className='text-xs text-muted-foreground mt-1'>
              {filter === 'pending' ? 'All caught up — no pending applications.' : 'No requests submitted yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className='hidden md:block'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-muted text-left text-xs text-muted-foreground uppercase tracking-wide'>
                    <th className='px-4 py-3 font-medium'>Organisation</th>
                    <th className='px-4 py-3 font-medium'>Type</th>
                    <th className='px-4 py-3 font-medium'>Contact</th>
                    <th className='px-4 py-3 font-medium'>State</th>
                    <th className='px-4 py-3 font-medium'>Status</th>
                    <th className='px-4 py-3 font-medium'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {requests.map(req => (
                    <tr key={req.id} className='hover:bg-muted/50'>
                      <td className='px-4 py-3'>
                        <Link to={`/admin/requests/${req.id}`} className='font-medium text-primary hover:underline'>
                          {req.org_name}
                        </Link>
                        <p className='text-xs text-muted-foreground'>{new Date(req.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className='px-4 py-3'>
                        <span className='bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full'>
                          {FACILITY_LABELS[req.facility_type] ?? req.facility_type}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <p className='text-foreground'>{req.contact_name}</p>
                        <p className='text-xs text-muted-foreground'>{req.contact_email}</p>
                      </td>
                      <td className='px-4 py-3 text-muted-foreground'>{req.state}</td>
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
                              onClick={() => setRejectTarget(req.id)}
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
            </div>

            {/* Mobile cards */}
            <div className='md:hidden divide-y divide-border'>
              {requests.map(req => (
                <div key={req.id} className='px-4 py-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <Link to={`/admin/requests/${req.id}`} className='text-sm font-medium text-primary hover:underline'>
                        {req.org_name}
                      </Link>
                      <p className='text-xs text-muted-foreground mt-0.5'>{req.contact_name} · {req.state}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      req.status === 'pending'  ? 'bg-amber-50 text-amber-700' :
                      req.status === 'approved' ? 'bg-green-50 text-green-700' :
                                                  'bg-red-50 text-red-700'
                    }`}>{req.status}</span>
                  </div>
                  {req.status === 'pending' && (
                    <div className='flex gap-2 mt-2'>
                      <button disabled={acting === req.id} onClick={() => { void handleApprove(req.id) }}
                        className='text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50'>Approve</button>
                      <button disabled={acting === req.id} onClick={() => setRejectTarget(req.id)}
                        className='text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg disabled:opacity-50'>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
