import { useState, useEffect, useCallback } from 'react'
import { LogIn, Plus, Pencil, Trash2, Download, Eye, Settings } from 'lucide-react'
import type { Home } from '../../../api/homes'
import { getAuditLogs, type AuditLog } from '../../../api/audit'
import { cn } from '../../../lib/cn'
import { formatDate } from '../../../utils/date'
import { todayStr } from '../../../utils/date'

interface Props {
  selectedHomeId: string
  homes: Home[]
}

function actionIcon(actionType: string) {
  const cls = 'w-4 h-4'
  if (actionType.includes('create') || actionType.includes('insert')) return <Plus className={cls} />
  if (actionType.includes('update') || actionType.includes('patch'))  return <Pencil className={cls} />
  if (actionType.includes('delete') || actionType.includes('remove')) return <Trash2 className={cls} />
  if (actionType.includes('login') || actionType.includes('auth'))    return <LogIn className={cls} />
  if (actionType.includes('export') || actionType.includes('download')) return <Download className={cls} />
  if (actionType.includes('settings') || actionType.includes('config')) return <Settings className={cls} />
  return <Eye className={cls} />
}

function actionColor(action: string): string {
  if (action.includes('create') || action.includes('insert')) return 'bg-emerald-500/15 text-emerald-400'
  if (action.includes('delete') || action.includes('remove')) return 'bg-red-500/15 text-red-400'
  if (action.includes('update') || action.includes('patch'))  return 'bg-amber-500/15 text-amber-400'
  if (action.includes('login') || action.includes('auth'))    return 'bg-indigo-500/15 text-indigo-400'
  return 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
}

export default function AuditTab({ selectedHomeId: _selectedHomeId }: Props) {
  const [logs,     setLogs]     = useState<AuditLog[]>([])
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [hasMore,  setHasMore]  = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState(todayStr())

  const load = useCallback((p: number, replace: boolean) => {
    setLoading(true)
    const params: Record<string, string | number> = { page: p, limit: 30 }
    if (dateFrom) params.from = dateFrom
    if (dateTo)   params.to   = dateTo + 'T23:59:59'
    getAuditLogs(params)
      .then(res => {
        const rows = res.data.data ?? []
        const meta = res.data.meta as { pages?: number } | undefined
        setLogs(prev => replace ? rows : [...prev, ...rows])
        setHasMore(p < (meta?.pages ?? 1))
        setPage(p)
      })
      .catch(() => {/* non-critical */})
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  useEffect(() => { load(1, true) }, [load])

  return (
    <div className='pb-4'>
      {/* Date range filter */}
      <div className='px-4 pt-4 pb-2 flex gap-2 flex-wrap'>
        <div>
          <label className='block text-xs text-zinc-500 dark:text-zinc-400 mb-1'>From</label>
          <input
            type='date'
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
          />
        </div>
        <div>
          <label className='block text-xs text-zinc-500 dark:text-zinc-400 mb-1'>To</label>
          <input
            type='date'
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className='bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
          />
        </div>
      </div>

      {/* Skeleton */}
      {loading && page === 1 && (
        <div className='px-4 pt-2 space-y-2'>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex gap-3 animate-pulse'>
              <div className='w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0' />
              <div className='flex-1 space-y-2'>
                <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3' />
                <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3' />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && logs.length === 0 && (
        <div className='mx-4 mt-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center'>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No audit events found.</p>
        </div>
      )}

      {/* Log feed */}
      {logs.length > 0 && (
        <div className='px-4 pt-2 space-y-2'>
          {logs.map(log => (
            <div key={log.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex gap-3'>
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', actionColor(log.action))}>
                {actionIcon(log.action)}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                      {log.user_first
                        ? `${log.user_first} ${log.user_last}`
                        : log.user_email ?? 'System'}
                    </p>
                    {log.description && (
                      <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate'>
                        {log.description}
                      </p>
                    )}
                    <p className='text-[10px] font-mono text-zinc-400 dark:text-zinc-600 mt-1'>
                      {log.action}{log.entity_type ? ` · ${log.entity_type}` : ''}
                    </p>
                  </div>
                  <span className='text-xs text-zinc-400 dark:text-zinc-500 shrink-0 whitespace-nowrap'>
                    {formatDate(log.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={() => load(page + 1, false)}
              disabled={loading}
              className='w-full py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-xl min-h-[44px] disabled:opacity-50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors'
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
