import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getAdminOrgs, suspendOrg, reactivateOrg, type AdminOrg } from '../../api/admin'
import { Skeleton } from '../../components/ui/skeleton'
import AdminLayout from './AdminLayout'

const FACILITY_LABELS: Record<string, string> = {
  group_home: 'Group Home', assisted_living: 'Assisted Living', foster_care: 'Foster Care',
  supported_living: 'Supported Living', day_program: 'Day Program', other: 'Other',
}

const STATUS_STYLES: Record<string, string> = {
  active:      'bg-green-50 text-green-700',
  pending_baa: 'bg-primary/10 text-primary',
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
      .catch(() => toast.error('Failed to load organisations'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleSuspend(id: string) {
    setActing(id)
    try { await suspendOrg(id); load() }
    catch { toast.error('Failed to suspend organisation') }
    finally { setActing(null) }
  }

  async function handleReactivate(id: string) {
    setActing(id)
    try { await reactivateOrg(id); load() }
    catch { toast.error('Failed to reactivate organisation') }
    finally { setActing(null) }
  }

  return (
    <AdminLayout>
      <h1 className='text-2xl font-bold text-foreground mb-6'>All Organisations</h1>

      <div className='bg-card rounded-xl border border-border overflow-hidden'>
        {loading ? (
          <div className='p-6 space-y-3'>
            {[...Array(4)].map((_, i) => (
              <div key={i} className='flex items-center gap-4'>
                <Skeleton className='h-4 flex-1' />
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-5 w-16 rounded-full' />
                <Skeleton className='h-4 w-20' />
              </div>
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className='p-8 text-center text-sm text-muted-foreground'>No organisations yet.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className='hidden md:block'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-muted text-left text-xs text-muted-foreground uppercase tracking-wide'>
                    <th className='px-4 py-3 font-medium'>Organisation</th>
                    <th className='px-4 py-3 font-medium'>Type</th>
                    <th className='px-4 py-3 font-medium'>Status</th>
                    <th className='px-4 py-3 font-medium'>BAA Signed</th>
                    <th className='px-4 py-3 font-medium'>Created</th>
                    <th className='px-4 py-3 font-medium'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {orgs.map(org => (
                    <tr key={org.id} className='hover:bg-muted/50'>
                      <td className='px-4 py-3 font-medium text-foreground'>{org.name}</td>
                      <td className='px-4 py-3'>
                        <span className='bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full'>
                          {FACILITY_LABELS[org.facility_type] ?? org.facility_type}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[org.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {org.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-muted-foreground text-xs'>
                        {org.baa_signed_at ? new Date(org.baa_signed_at).toLocaleDateString() : '—'}
                      </td>
                      <td className='px-4 py-3 text-muted-foreground text-xs'>
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
            </div>

            {/* Mobile cards */}
            <div className='md:hidden divide-y divide-border'>
              {orgs.map(org => (
                <div key={org.id} className='px-4 py-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <p className='text-sm font-medium text-foreground'>{org.name}</p>
                      <p className='text-xs text-muted-foreground mt-0.5'>{FACILITY_LABELS[org.facility_type] ?? org.facility_type}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[org.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {org.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className='flex items-center justify-between mt-2'>
                    <p className='text-xs text-muted-foreground'>
                      BAA: {org.baa_signed_at ? new Date(org.baa_signed_at).toLocaleDateString() : '—'}
                    </p>
                    {org.status === 'suspended' ? (
                      <button disabled={acting === org.id} onClick={() => { void handleReactivate(org.id) }}
                        className='text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg disabled:opacity-50'>Reactivate</button>
                    ) : org.status === 'active' ? (
                      <button disabled={acting === org.id} onClick={() => { void handleSuspend(org.id) }}
                        className='text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg disabled:opacity-50'>Suspend</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
