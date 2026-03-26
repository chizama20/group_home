import { useState } from 'react'
import type { Task } from '../../types/task'
import { claimTask, completeTask } from '../../api/tasks'

interface Props {
  tasks:         Task[]
  currentUserId: string
  onRefresh:     () => void
}

export default function ShiftTasksSection({ tasks, currentUserId, onRefresh }: Props) {
  const [acting, setActing] = useState<string | null>(null)

  const unclaimed = tasks.filter(t => !t.claimed_by && !t.completed_at)
  const myTasks   = tasks.filter(t => t.claimed_by === currentUserId && !t.completed_at)
  const claimed   = tasks.filter(t => t.claimed_by && t.claimed_by !== currentUserId && !t.completed_at)
  const completed = tasks.filter(t => !!t.completed_at)

  if (!tasks.length) return null

  async function handleClaim(id: string) {
    setActing(id)
    try { await claimTask(id); onRefresh() }
    finally { setActing(null) }
  }

  async function handleComplete(id: string) {
    setActing(id)
    try { await completeTask(id); onRefresh() }
    finally { setActing(null) }
  }

  const active = [...myTasks, ...unclaimed, ...claimed]

  return (
    <div className='mx-4 mt-4'>
      <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Shift Tasks</p>
      <div className='bg-white rounded-xl border border-gray-100 overflow-hidden'>
        {active.map(task => {
          const isMine    = task.claimed_by === currentUserId
          const isClaimed = !!task.claimed_by && !isMine
          return (
            <div key={task.id} className='flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0'>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-gray-900 truncate'>{task.title}</p>
                {isClaimed && (
                  <p className='text-xs text-gray-400 mt-0.5'>Claimed by someone else</p>
                )}
                {isMine && (
                  <p className='text-xs text-blue-500 mt-0.5'>Claimed by you</p>
                )}
              </div>
              {isMine && (
                <button
                  disabled={acting === task.id}
                  onClick={() => { void handleComplete(task.id) }}
                  className='text-xs font-semibold text-white bg-green-500 px-3 py-1.5 rounded-lg min-h-[36px] disabled:opacity-50 shrink-0'
                >
                  {acting === task.id ? '…' : 'Done'}
                </button>
              )}
              {!task.claimed_by && (
                <button
                  disabled={acting === task.id}
                  onClick={() => { void handleClaim(task.id) }}
                  className='text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg min-h-[36px] disabled:opacity-50 shrink-0'
                >
                  {acting === task.id ? '…' : 'Claim'}
                </button>
              )}
            </div>
          )
        })}
        {completed.map(task => (
          <div key={task.id} className='flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 opacity-40'>
            <span className='text-green-500 text-sm shrink-0'>✓</span>
            <p className='text-sm text-gray-500 line-through truncate'>{task.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
