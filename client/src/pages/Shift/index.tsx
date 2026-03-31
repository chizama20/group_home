import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import BottomNav from '../../components/BottomNav'
import HomeSwitcherStrip from '../../components/HomeSwitcherStrip'
import { useHome } from '../../context/HomeContext'
import { useAuth } from '../../context/AuthContext'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { clockIn, clockOut } from '../../api/homes'
import { getShiftNotes, createShiftNote } from '../../api/logs'
import { getResidents } from '../../api/residents'
import { queueSubmission, flushQueue } from '../../utils/offlineQueue'
import api from '../../api/client'
import { currentShift, SHIFT_LABELS } from '../../types/log'
import type { Shift, ShiftNote } from '../../types/log'
import type { Resident } from '../../types/resident'
import { todayStr } from '../../utils/date'
import ShiftNotesFeed from './ShiftNotesFeed'
import ComposeBar from './ComposeBar'

const SHIFTS: Shift[] = ['day', 'evening', 'night']

function prevShift(s: Shift): Shift {
  if (s === 'day')     return 'night'
  if (s === 'evening') return 'day'
  return 'evening'
}

export default function ShiftPage() {
  const { user }   = useAuth()
  const { homeId } = useHome()
  const isOnline   = useOnlineStatus()
  const prevOnline = useRef(isOnline)

  const [shift, setShift]             = useState<Shift>(currentShift())
  const date                          = todayStr()
  const [clockStatus, setClockStatus] = useState<'idle' | 'in' | 'out'>('idle')

  const [currentNotes, setCurrentNotes]   = useState<ShiftNote[]>([])
  const [previousNotes, setPreviousNotes] = useState<ShiftNote[]>([])
  const [residents, setResidents]         = useState<Resident[]>([])
  const [loading, setLoading]             = useState(false)
  const [submitting, setSubmitting]       = useState(false)

  // Load notes + residents whenever home or shift changes
  useEffect(() => {
    if (!homeId) return
    setLoading(true)
    const prev = prevShift(shift)
    Promise.allSettled([
      getShiftNotes(homeId, { shift, date }),
      getShiftNotes(homeId, { shift: prev, date }),
      getResidents(homeId),
    ]).then(([cur, pre, res]) => {
      setCurrentNotes(cur.status  === 'fulfilled' ? (cur.value.data.data  ?? []) : [])
      setPreviousNotes(pre.status === 'fulfilled' ? (pre.value.data.data ?? []) : [])
      setResidents(res.status     === 'fulfilled' ? (res.value.data.data ?? []) : [])
    }).finally(() => setLoading(false))
  }, [homeId, shift, date])

  // Flush offline queue when coming back online
  useEffect(() => {
    const wasOffline = !prevOnline.current
    prevOnline.current = isOnline

    if (!isOnline || !wasOffline) return

    void flushQueue(
      async (item) => { await api.post(item.url, item.body) },
      (flushed, total) => {
        if (flushed === total)
          toast.success(`${total} queued note${total > 1 ? 's' : ''} synced`)
      }
    ).then(() => {
      // Refresh notes after flush
      if (homeId) {
        getShiftNotes(homeId, { shift, date })
          .then(res => setCurrentNotes(res.data.data ?? []))
          .catch(() => {/* non-critical */})
      }
    })
  }, [isOnline, homeId, shift, date])

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

  async function handlePost(content: string, residentId: string | null, flagged: boolean) {
    if (!homeId || !user) return
    setSubmitting(true)

    const body = { resident_id: residentId, shift, shift_date: date, content, flagged }

    try {
      await createShiftNote(homeId, body)
      const res = await getShiftNotes(homeId, { shift, date })
      setCurrentNotes(res.data.data ?? [])
    } catch {
      // Queue for later sync if offline or request failed
      await queueSubmission('shift-note', `/homes/${homeId}/shift-notes`, 'POST', body)
      toast('Note saved — will sync when back online', { icon: '📋' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='pb-48 min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white border-b border-gray-100'>
        <div className='px-4 pt-5 pb-3'>
          <h1 className='text-xl font-bold text-gray-900 mb-3'>Shift</h1>
          <select
            value={shift}
            onChange={e => { setShift(e.target.value as Shift); setClockStatus('idle') }}
            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white'
          >
            {SHIFTS.map(s => (
              <option key={s} value={s}>{SHIFT_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <HomeSwitcherStrip />
      </div>

      {/* Time clock */}
      <div className='bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm'>
        <h2 className='text-sm font-semibold text-gray-700 mb-3'>Time Clock</h2>
        <div className='flex gap-3'>
          <button
            onClick={() => void handleClock('in')}
            disabled={clockStatus === 'in' || !homeId}
            className='flex-1 bg-green-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'
          >
            Clock In
          </button>
          <button
            onClick={() => void handleClock('out')}
            disabled={clockStatus !== 'in' || !homeId}
            className='flex-1 bg-red-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'
          >
            Clock Out
          </button>
        </div>
        {clockStatus === 'in'  && <p className='text-xs text-green-600 mt-2 text-center'>Clocked in ✓</p>}
        {clockStatus === 'out' && <p className='text-xs text-gray-500 mt-2 text-center'>Clocked out</p>}
      </div>

      {/* Shift notes */}
      <div className='mx-4 mt-4'>
        <h2 className='text-sm font-semibold text-gray-700 mb-2'>Shift Notes</h2>
        <ShiftNotesFeed
          currentNotes={currentNotes}
          previousNotes={previousNotes}
          loading={loading}
        />
      </div>

      <BottomNav />

      <ComposeBar
        residents={residents}
        submitting={submitting}
        onPost={handlePost}
      />
    </div>
  )
}
