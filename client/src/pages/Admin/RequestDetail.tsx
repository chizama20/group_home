import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getOrgRequest, approveOrgRequest, rejectOrgRequest, type OrgRequest } from '../../api/admin'
import AdminLayout from './AdminLayout'

const FACILITY_LABELS: Record<string, string> = {
  group_home: 'Group Home', assisted_living: 'Assisted Living', foster_care: 'Foster Care',
  supported_living: 'Supported Living', day_program: 'Day Program', other: 'Other',
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className='text-xs text-gray-500 uppercase tracking-wide mb-0.5'>{label}</p>
      <p className='text-sm text-gray-900'>{value ?? '—'}</p>
    </div>
  )
}

export default function AdminRequestDetail() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const [req, setReq]         = useState<OrgRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason]     = useState('')

  useEffect(() => {
    if (!id) return
    getOrgRequest(id)
      .then(res => { if (res.data.success && res.data.data) setReq(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function handleApprove() {
    if (!req) return
    setActing(true)
    try {
      await approveOrgRequest(req.id)
      toast.success('Request approved')
      navigate('/admin/requests')
    } catch {
      toast.error('Failed to approve request')
      setActing(false)
    }
  }

  async function handleReject() {
    if (!req) return
    setActing(true)
    setShowRejectForm(false)
    try {
      await rejectOrgRequest(req.id, rejectReason || undefined)
      toast.success('Request rejected')
      navigate('/admin/requests')
    } catch {
      toast.error('Failed to reject request')
      setActing(false)
    }
  }

  if (loading) return (
    <AdminLayout>
      <div className='space-y-4'>
        <div className='h-8 w-48 bg-gray-100 rounded animate-pulse' />
        <div className='h-48 bg-gray-100 rounded-xl animate-pulse' />
      </div>
    </AdminLayout>
  )
  if (!req) return <AdminLayout><div className='text-sm text-red-500'>Request not found.</div></AdminLayout>

  return (
    <AdminLayout>
      <div className='flex items-center gap-3 mb-6'>
        <button onClick={() => navigate(-1)} className='text-sm text-gray-500 hover:underline'>← Back</button>
        <h1 className='text-2xl font-bold text-gray-900'>{req.org_name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          req.status === 'pending'  ? 'bg-amber-50 text-amber-700' :
          req.status === 'approved' ? 'bg-green-50 text-green-700' :
                                      'bg-red-50 text-red-700'
        }`}>
          {req.status}
        </span>
      </div>

      <div className='bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-2 gap-6 mb-6'>
        <Field label='Facility type' value={FACILITY_LABELS[req.facility_type] ?? req.facility_type} />
        <Field label='State' value={req.state} />
        <Field label='Contact name' value={req.contact_name} />
        <Field label='Contact email' value={req.contact_email} />
        <Field label='Contact phone' value={req.contact_phone} />
        <Field label='Number of locations' value={req.num_homes} />
        <Field label='Submitted' value={new Date(req.created_at).toLocaleString()} />
        {req.reviewed_at && <Field label='Reviewed' value={new Date(req.reviewed_at).toLocaleString()} />}
      </div>

      {req.current_operations && (
        <div className='bg-white rounded-xl border border-gray-200 p-6 mb-4'>
          <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>Current operations</p>
          <p className='text-sm text-gray-800'>{req.current_operations}</p>
        </div>
      )}

      {req.additional_notes && (
        <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
          <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>Additional notes</p>
          <p className='text-sm text-gray-800'>{req.additional_notes}</p>
        </div>
      )}

      {req.status === 'pending' && (
        <div className='space-y-4'>
          {!showRejectForm ? (
            <div className='flex gap-3'>
              <button disabled={acting} onClick={() => { void handleApprove() }}
                className='bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50'>
                Approve
              </button>
              <button disabled={acting} onClick={() => setShowRejectForm(true)}
                className='bg-red-50 text-red-600 border border-red-200 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50'>
                Reject
              </button>
            </div>
          ) : (
            <div className='bg-red-50 border border-red-200 rounded-xl p-5'>
              <p className='text-sm font-semibold text-red-800 mb-3'>Rejection reason (optional)</p>
              <textarea
                autoFocus
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder='Provide a reason for rejection…'
                rows={3}
                className='w-full border border-red-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-300'
              />
              <div className='flex gap-2 mt-3'>
                <button
                  disabled={acting}
                  onClick={() => { void handleReject() }}
                  className='bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50'>
                  Confirm Rejection
                </button>
                <button
                  onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                  className='px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50'>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {req.status === 'rejected' && req.rejection_reason && (
        <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
          <p className='text-xs text-red-500 uppercase tracking-wide mb-1'>Rejection reason</p>
          <p className='text-sm text-red-800'>{req.rejection_reason}</p>
        </div>
      )}
    </AdminLayout>
  )
}
