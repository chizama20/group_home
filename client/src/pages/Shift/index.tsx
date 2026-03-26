import { useState, useEffect } from 'react'
import BottomNav from '../../components/BottomNav'
import { useSelectedHome } from '../../hooks/useSelectedHome'
import { useAuth } from '../../context/AuthContext'
import { getHomeTasks, claimTask, completeTask, type Task } from '../../api/tasks'
import { clockIn, clockOut } from '../../api/homes'
import type { Shift } from '../../types/log'

const SHIFTS: Shift[] = ['morning', 'afternoon', 'overnight']

function todayStr() {
  return new Date().toISOString().split('T')[0]!
}

function currentShift(): Shift {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return 'morning'
  if (h >= 14 && h < 22) return 'afternoon'
  return 'overnight'
}

async function refreshTasks(homeId: string, setTasks: (t: Task[]) => void) {
  const res = await getHomeTasks(homeId).catch(() => null)
  if (res) setTasks(res.data.data ?? [])
}

export default function ShiftPage() {
  const { user } = useAuth()
  const { homeId, homes, selectHome } = useSelectedHome()
  const [tasks, setTasks]     = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [shift, setShift]     = useState<Shift>(currentShift())
  const date                  = todayStr()
  const [clockStatus, setClockStatus] = useState<'idle' | 'in' | 'out'>('idle')

  useEffect(() => {
    if (!homeId) return
    setLoading(true)
    getHomeTasks(homeId)
      .then(res => setTasks(res.data.data ?? []))
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [homeId])

  async function handleClock(action: 'in' | 'out') {
    if (!homeId) return
    try {
      if (action === 'in') {
        await clockIn(homeId, { shift, shift_date: date })
        setClockStatus('in')
      } else {
        await clockOut(homeId, { shift, shift_date: date })
        setClockStatus('out')
      }
    } catch { /* ignore */ }
  }

  async function handleClaim(id: string) {
    await claimTask(id).catch(() => { /* ignore */ })
    if (homeId) await refreshTasks(homeId, setTasks)
  }

  async function handleComplete(id: string) {
    await completeTask(id).catch(() => { /* ignore */ })
    if (homeId) await refreshTasks(homeId, setTasks)
  }

  const unclaimed = tasks.filter(t => !t.claimed_by && !t.completed_at)
  const myTasks   = tasks.filter(t => t.claimed_by === user?.id && !t.completed_at)
  const done      = tasks.filter(t => !!t.completed_at)

  const taskGroups = [
    { label: 'My tasks',  items: myTasks },
    { label: 'Unclaimed', items: unclaimed },
    { label: 'Completed', items: done },
  ].filter(g => g.items.length > 0)

  return (
    <div className='pb-20 min-h-screen bg-gray-50'>
      <div className='bg-white px-4 pt-5 pb-3 border-b border-gray-100'>
        <h1 className='text-xl font-bold text-gray-900 mb-3'>Shift</h1>

        {homes.length > 1 && (
          <select
            value={homeId ?? ''}
            onChange={e => selectHome(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] mb-3 bg-white'
          >
            {homes.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        )}

        <select
          value={shift}
          onChange={e => setShift(e.target.value as Shift)}
          className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white'
        >
          {SHIFTS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Time clock */}
      <div className='bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm'>
        <h2 className='text-sm font-semibold text-gray-700 mb-3'>Time Clock</h2>
        <div className='flex gap-3'>
          <button
            onClick={() => void handleClock('in')}
            disabled={clockStatus === 'in' || !homeId}
            className='flex-1 bg-green-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50 hover:bg-green-700'
          >
            Clock In
          </button>
          <button
            onClick={() => void handleClock('out')}
            disabled={clockStatus !== 'in' || !homeId}
            className='flex-1 bg-red-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50 hover:bg-red-700'
          >
            Clock Out
          </button>
        </div>
        {clockStatus === 'in'  && <p className='text-xs text-green-600 mt-2 text-center'>Clocked in ✓</p>}
        {clockStatus === 'out' && <p className='text-xs text-gray-500 mt-2 text-center'>Clocked out</p>}
      </div>

      {/* Tasks */}
      <div className='mx-4 mt-4 space-y-3'>
        {loading && <p className='text-sm text-gray-500'>Loading tasks…</p>}

        {taskGroups.map(group => (
          <div key={group.label} className='bg-white rounded-xl shadow-sm overflow-hidden'>
            <h2 className='px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-b border-gray-100'>
              {group.label} ({group.items.length})
            </h2>
            {group.items.map(task => (
              <div key={task.id} className='p-4 border-b border-gray-50 last:border-0'>
                <p className='text-sm font-medium text-gray-900'>{task.title}</p>
                {task.description && (
                  <p className='text-xs text-gray-500 mt-0.5'>{task.description}</p>
                )}
                {!task.completed_at && (
                  <div className='flex gap-2 mt-2'>
                    {!task.claimed_by && (
                      <button
                        onClick={() => void handleClaim(task.id)}
                        className='px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium min-h-[44px] hover:bg-blue-200'
                      >
                        Claim
                      </button>
                    )}
                    {task.claimed_by === user?.id && (
                      <button
                        onClick={() => void handleComplete(task.id)}
                        className='px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-medium min-h-[44px] hover:bg-green-200'
                      >
                        Complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {!loading && tasks.length === 0 && homeId && (
          <p className='text-sm text-gray-500'>No tasks for today</p>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
