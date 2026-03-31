import { useEffect, useState } from 'react'
import { getAdminOrgs, suspendOrg, reactivateOrg, type AdminOrg } from '../../api/admin'
import AdminLayout from './AdminLayout'

const FACILITY_LABELS: Record<string, string> = {
  group_home: 'Group Home', assisted_living: 'Assisted Living', foster_care: 'Foster Care',
  supported_living: 'Supported Living', day_program: 'Day Program', other: 'Other',
}

const STATUS_STYLES: Record<string, string> = {
  active:      'bg-green-50 text-green-700',
  pending_baa: 'bg-blue-50 text-blue-700',
  pending:     'bg-amber-50 text-amber-700',
  suspended:   'bg-red-50 text-red-700',
}

export default function AdminOrgs() {
  const [orgs, setOrgs]     = useState<AdminOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState<string | null>(null)

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
    try { await suspendOrg(id); load() }
    catch { /* handle silently */ }
    finally { setActing(null) }
  }

  async function handleReactivate(id: string) {
    setActing(id)
    try { await reactivateOrg(id); load() }
    catch { /* handle silently */ }
    finally { setActing(null) }
  }

  return (
    <AdminLayout>
      <h1 className='text-2xl font-bold text-gray-900 mb-6'>All Organisations</h1>

      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        {loading ? (
          <div className='p-8 text-center text-sm text-gray-400'>Loading…</div>
        ) : orgs.length === 0 ? (
          <div className='p-8 text-center text-sm text-gray-400'>No organisations yet.</div>
        ) : (
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide'>
                <th className='px-4 py-3 font-medium'>Organisation</th>
                <th className='px-4 py-3 font-medium'>Type</th>
                <th className='px-4 py-3 font-medium'>Status</th>
                <th className='px-4 py-3 font-medium'>BAA Signed</th>
                <th className='px-4 py-3 font-medium'>Created</th>
                <th className='px-4 py-3 font-medium'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {orgs.map(org => (
                <tr key={org.id} className='hover:bg-gray-50'>
                  <td className='px-4 py-3 font-medium text-gray-900'>{org.name}</td>
                  <td className='px-4 py-3'>
                    <span className='bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full'>
                      {FACILITY_LABELS[org.facility_type] ?? org.facility_type}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[org.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {org.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-gray-500 text-xs'>
                    {org.baa_signed_at ? new Date(org.baa_signed_at).toLocaleDateString() : '—'}
                  </td>
                  <td className='px-4 py-3 text-gray-500 text-xs'>
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className='px-4 py-3'>
                    {org.status === 'suspended' ? (
                      <button disabled={acting === org.id} onClick={() => { void handleReactivate(org.id) }}
                        className='text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50'>
                        Reactivate
                      </button>
                    ) : org.status === 'active' ? (
                      <button disabled={acting === org.id} onClick={() => { void handleSuspend(org.id) }}
                        className='text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50'>
                        Suspend
                      </button>
                    ) : null}
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
