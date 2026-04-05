import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrgRequest, approveOrgRequest, rejectOrgRequest, type OrgRequest } from '../../api/admin'
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

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className='text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5'>{label}</p>
      <p className='text-sm text-zinc-900 dark:text-white'>{value ?? '—'}</p>
    </div>
  )
}

export default function AdminRequestDetail() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const [req, setReq]         = useState<OrgRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

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
    setActionError(null)
    try {
      await approveOrgRequest(req.id)
      navigate('/admin/requests')
    } catch {
      setActionError('Failed to approve. Please try again.')
      setActing(false)
    }
  }

  async function handleReject() {
    if (!req) return
    const reason = window.prompt('Rejection reason (optional):') ?? ''
    setActing(true)
    setActionError(null)
    try {
      await rejectOrgRequest(req.id, reason || undefined)
      navigate('/admin/requests')
    } catch {
      setActionError('Failed to reject. Please try again.')
      setActing(false)
    }
  }

  if (loading) return <AdminLayout><div className='text-sm text-zinc-400 dark:text-zinc-500'>Loading…</div></AdminLayout>
  if (!req)    return <AdminLayout><div className='text-sm text-red-500 dark:text-red-400'>Request not found.</div></AdminLayout>

  return (
    <AdminLayout>
      <div className='flex items-center gap-3 mb-6'>
        <button onClick={() => navigate(-1)} className='text-sm text-zinc-500 dark:text-zinc-400 hover:underline'>← Back</button>
        <h1 className='text-2xl font-bold text-zinc-900 dark:text-white'>{req.org_name}</h1>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium',
          req.status === 'pending'  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
          req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                      'bg-red-500/10 text-red-600 dark:text-red-400'
        )}>
          {req.status}
        </span>
      </div>

      {actionError && (
        <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg mb-4'>
          {actionError}
        </p>
      )}

      <div className='bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
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
        <div className='bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-4'>
          <p className='text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1'>Current operations</p>
          <p className='text-sm text-zinc-800 dark:text-zinc-200'>{req.current_operations}</p>
        </div>
      )}

      {req.additional_notes && (
        <div className='bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6'>
          <p className='text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1'>Additional notes</p>
          <p className='text-sm text-zinc-800 dark:text-zinc-200'>{req.additional_notes}</p>
        </div>
      )}

      {req.status === 'pending' && (
        <div className='flex gap-3'>
          <button disabled={acting} onClick={() => { void handleApprove() }}
            className='bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors'>
            Approve
          </button>
          <button disabled={acting} onClick={() => { void handleReject() }}
            className='bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-500/20 disabled:opacity-50 transition-colors'>
            Reject
          </button>
        </div>
      )}

      {req.status === 'rejected' && req.rejection_reason && (
        <div className='bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4'>
          <p className='text-xs text-red-500 dark:text-red-400 uppercase tracking-wide mb-1'>Rejection reason</p>
          <p className='text-sm text-red-800 dark:text-red-300'>{req.rejection_reason}</p>
        </div>
      )}
    </AdminLayout>
  )
}
