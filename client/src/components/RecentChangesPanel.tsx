import { useState, useEffect, useCallback } from 'react'
import { CheckCheck } from 'lucide-react'
import { getRecentScheduleChanges, markScheduleChangesSeen } from '../api/schedule'
import type { RecentChangeItem } from '../types/schedule'

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function ChangeRow({ item }: { item: RecentChangeItem }) {
  const actor = item.actor_first && item.actor_last ? `${item.actor_first} ${item.actor_last}` : 'Someone'
  return (
    <div className='flex items-start gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0'>
      {!!item.is_new && (
        <span className='w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0' />
      )}
      <div className={`flex-1 min-w-0 ${!item.is_new ? 'ml-[18px]' : ''}`}>
        <p className='text-sm text-zinc-900 dark:text-white'>
          {item.description ?? `${actor} updated the schedule`}
        </p>
        <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-0.5'>
          {actor} · {timeAgo(item.created_at)}
        </p>
      </div>
    </div>
  )
}

export default function RecentChangesPanel({ onUnseenChange }: { onUnseenChange?: (count: number) => void }) {
  const [items, setItems] = useState<RecentChangeItem[]>([])
  const [unseenCount, setUnseenCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getRecentScheduleChanges()
      .then(res => {
        if (res.data.success && res.data.data) {
          setItems(res.data.data.items)
          setUnseenCount(res.data.data.unseenCount)
          onUnseenChange?.(res.data.data.unseenCount)
        }
      })
      .catch(() => {/* non-critical */})
      .finally(() => setLoading(false))
  }, [onUnseenChange])

  useEffect(() => { load() }, [load])

  async function handleMarkSeen() {
    try {
      await markScheduleChangesSeen()
      setUnseenCount(0)
      onUnseenChange?.(0)
      setItems(prev => prev.map(i => ({ ...i, is_new: 0 })))
    } catch {
      // non-critical
    }
  }

  return (
    <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden'>
      <div className='flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800'>
        <span className='text-sm font-semibold text-zinc-900 dark:text-white'>Recent Changes</span>
        {unseenCount > 0 && (
          <button
            onClick={() => { void handleMarkSeen() }}
            className='flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors'
          >
            <CheckCheck className='w-3.5 h-3.5' />
            Mark all seen
          </button>
        )}
      </div>

      {loading && items.length === 0 && (
        <div className='px-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500'>Loading…</div>
      )}

      {!loading && items.length === 0 && (
        <div className='px-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500'>No recent activity.</div>
      )}

      {items.map(item => <ChangeRow key={item.id} item={item} />)}
    </div>
  )
}
