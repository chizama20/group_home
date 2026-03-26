import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createAnnouncement } from '../../api/logs'

interface Props {
  homeId:   string
  onPosted: () => void
}

export default function AnnouncementComposer({ homeId, onPosted }: Props) {
  const { org }               = useAuth()
  const [open, setOpen]       = useState(false)
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [pinned, setPinned]   = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handlePost(e: FormEvent) {
    e.preventDefault()
    if (!org || !title.trim() || !body.trim()) return
    setPosting(true)
    setError(null)
    try {
      await createAnnouncement(org.id, { title: title.trim(), body: body.trim(), home_id: homeId, is_pinned: pinned })
      setTitle('')
      setBody('')
      setPinned(false)
      setOpen(false)
      onPosted()
    } catch {
      setError('Failed to post announcement')
    } finally {
      setPosting(false)
    }
  }

  if (!open) {
    return (
      <div className='mx-4 mt-4'>
        <button
          onClick={() => setOpen(true)}
          className='w-full bg-white border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-400 text-left min-h-[44px] hover:border-blue-300 hover:text-blue-400 transition-colors'
        >
          + Post an announcement…
        </button>
      </div>
    )
  }

  return (
    <div className='mx-4 mt-4 bg-white border border-blue-200 rounded-xl p-4'>
      <p className='text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3'>New Announcement</p>
      <form onSubmit={e => { void handlePost(e) }} className='space-y-3'>
        <input
          type='text'
          placeholder='Title'
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
        <textarea
          placeholder='Message…'
          required
          rows={3}
          value={body}
          onChange={e => setBody(e.target.value)}
          className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
        <label className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer'>
          <input
            type='checkbox'
            checked={pinned}
            onChange={e => setPinned(e.target.checked)}
            className='w-4 h-4 accent-blue-600'
          />
          Pin announcement
        </label>

        {error && <p className='text-xs text-red-600'>{error}</p>}

        <div className='flex gap-2 pt-1'>
          <button
            type='button'
            onClick={() => { setOpen(false); setTitle(''); setBody(''); setError(null) }}
            className='flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 min-h-[44px]'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={posting || !title.trim() || !body.trim()}
            className='flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50'
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}
