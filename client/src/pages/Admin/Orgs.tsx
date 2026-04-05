import { useEffect, useState } from 'react'
import { getAdminOrgs, suspendOrg, reactivateOrg, type AdminOrg } from '../../api/admin'
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

const STATUS_STYLES: Record<string, string> = {
  active:      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  pending_baa: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  pending:     'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  suspended:   'bg-red-500/10 text-red-600 dark:text-red-400',
}

export default function AdminOrgs() {
  const [orgs, setOrgs]       = useState<AdminOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    getAdminOrgs()
      .then(res => { if (res.data.success && res.data.data) setOrgs(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleSuspend(id: string) {
    setActing(id)
    setActionError(null)
    try { await suspendOrg(id); load() }
    catch { setActionError('Failed to suspend organisation. Please try again.') }
    finally { setActing(null) }
  }

  async function handleReactivate(id: string) {
    setActing(id)
    setActionError(null)
    try { await reactivateOrg(id); load() }
    catch { setActionError('Failed to reactivate organisation. Please try again.') }
    finally { setActing(null) }
  }

  return (
    <AdminLayout>
      <h1 className='text-2xl font-bold text-zinc-900 dark:text-white mb-6'>All Organisations</h1>

      {actionError && (
        <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg mb-4'>
          {actionError}
        </p>
      )}

      <div className='bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden'>
        {loading ? (
          <div className='p-8 text-center text-sm text-zinc-400 dark:text-zinc-500'>Loading…</div>
        ) : orgs.length === 0 ? (
          <div className='p-8 text-center text-sm text-zinc-400 dark:text-zinc-500'>No organisations yet.</div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-zinc-50 dark:bg-zinc-800/50 text-left text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide'>
                  <th className='px-4 py-3 font-medium'>Organisation</th>
                  <th className='px-4 py-3 font-medium'>Type</th>
                  <th className='px-4 py-3 font-medium'>Status</th>
                  <th className='px-4 py-3 font-medium'>BAA Signed</th>
                  <th className='px-4 py-3 font-medium'>Created</th>
                  <th className='px-4 py-3 font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-zinc-100 dark:divide-zinc-800'>
                {orgs.map(org => (
                  <tr key={org.id} className='hover:bg-zinc-50 dark:hover:bg-zinc-800/40'>
                    <td className='px-4 py-3 font-medium text-zinc-900 dark:text-white'>{org.name}</td>
                    <td className='px-4 py-3'>
                      <span className='bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 rounded-full'>
                        {FACILITY_LABELS[org.facility_type] ?? org.facility_type}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[org.status] ?? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400')}>
                        {org.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs'>
                      {org.baa_signed_at ? new Date(org.baa_signed_at).toLocaleDateString() : '—'}
                    </td>
                    <td className='px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs'>
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className='px-4 py-3'>
                      {org.status === 'suspended' ? (
                        <button disabled={acting === org.id} onClick={() => { void handleReactivate(org.id) }}
                          className='text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 transition-colors'>
                          Reactivate
                        </button>
                      ) : org.status === 'active' ? (
                        <button disabled={acting === org.id} onClick={() => { void handleSuspend(org.id) }}
                          className='text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors'>
                          Suspend
                        </button>
                      ) : null}
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
