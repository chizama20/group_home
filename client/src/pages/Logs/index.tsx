import { useState, useEffect, type FormEvent } from 'react'
import BottomNav from '../../components/BottomNav'
import { useSelectedHome } from '../../hooks/useSelectedHome'
import { getShiftNotes, createShiftNote } from '../../api/logs'
import type { ShiftNote, Shift } from '../../types/log'

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

export default function LogsPage() {
  const { homeId, homes, selectHome } = useSelectedHome()
  const [notes, setNotes]             = useState<ShiftNote[]>([])
  const [loading, setLoading]         = useState(false)
  const [shift, setShift]             = useState<Shift>(currentShift())
  const [date, setDate]               = useState(todayStr())
  const [content, setContent]         = useState('')
  const [flagged, setFlagged]         = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  useEffect(() => {
    if (!homeId) return
    setLoading(true)
    getShiftNotes(homeId, { shift, date })
      .then(res => setNotes(res.data.data ?? []))
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [homeId, shift, date])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!homeId || !content.trim()) return
    setSubmitting(true)
    try {
      await createShiftNote(homeId, {
        resident_id: null,
        shift,
        shift_date: date,
        content,
        flagged,
      })
      setContent('')
      setFlagged(false)
      const res = await getShiftNotes(homeId, { shift, date })
      setNotes(res.data.data ?? [])
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='pb-20 min-h-screen bg-gray-50'>
      <div className='bg-white px-4 pt-5 pb-3 border-b border-gray-100'>
        <h1 className='text-xl font-bold text-gray-900 mb-3'>Shift Notes</h1>

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

        <div className='flex gap-2'>
          <select
            value={shift}
            onChange={e => setShift(e.target.value as Shift)}
            className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white'
          >
            {SHIFTS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <input
            type='date'
            value={date}
            onChange={e => setDate(e.target.value)}
            className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px]'
          />
        </div>
      </div>

      {/* Post form */}
      <form onSubmit={e => { void handleSubmit(e) }} className='bg-white border-b border-gray-100 p-4 space-y-3'>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder='Write a shift note…'
          rows={3}
          className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
        <div className='flex items-center justify-between'>
          <label className='flex items-center gap-2 text-sm text-gray-700 min-h-[44px]'>
            <input
              type='checkbox'
              checked={flagged}
              onChange={e => setFlagged(e.target.checked)}
              className='w-4 h-4'
            />
            Flag this note
          </label>
          <button
            type='submit'
            disabled={submitting || !content.trim() || !homeId}
            className='bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold min-h-[44px] disabled:opacity-50 hover:bg-blue-700'
          >
            Post
          </button>
        </div>
      </form>

      {/* Notes list */}
      <div className='divide-y divide-gray-100'>
        {loading && <p className='p-4 text-sm text-gray-500'>Loading…</p>}
        {notes.map(note => (
          <div
            key={note.id}
            className={`bg-white p-4 ${note.flagged ? 'border-l-4 border-red-400' : ''}`}
          >
            <p className='text-sm text-gray-900'>{note.content}</p>
            <p className='text-xs text-gray-400 mt-1'>
              {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
        {!loading && notes.length === 0 && (
          <p className='p-4 text-sm text-gray-500'>No notes for this shift</p>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
