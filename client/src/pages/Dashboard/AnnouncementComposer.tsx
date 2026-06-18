import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createAnnouncement } from '../../api/logs'

interface Props {
  homeId:   string
  onPosted: () => void
}

export default function AnnouncementComposer({ homeId, onPosted }: Props) {
  const { org, user }           = useAuth()
  const isOrgAdmin              = user?.role === 'org_admin'
  const [open, setOpen]         = useState(false)
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [pinned, setPinned]     = useState(false)
  const [allHomes, setAllHomes] = useState(false)
  const [posting, setPosting]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handlePost(e: FormEvent) {
    e.preventDefault()
    if (!org || !title.trim() || !body.trim()) return
    setPosting(true)
    setError(null)
    try {
      const home_id = (isOrgAdmin && allHomes) ? undefined : homeId
      await createAnnouncement(org.id, { title: title.trim(), body: body.trim(), home_id, is_pinned: pinned })
      setTitle('')
      setBody('')
      setPinned(false)
      setAllHomes(false)
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
          className='w-full bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-400 dark:text-zinc-500 text-left min-h-[44px] hover:border-primary dark:hover:border-primary hover:text-primary transition-colors'
        >
          + Post an announcement…
        </button>
      </div>
    )
  }

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <div className='mx-4 mt-4 bg-white dark:bg-zinc-900 border border-primary dark:border-primary/30 rounded-xl p-4'>
      <p className='text-xs font-semibold text-primary dark:text-primary uppercase tracking-wide mb-3'>New Announcement</p>
      <form onSubmit={e => { void handlePost(e) }} className='space-y-3'>
        <input
          type='text'
          placeholder='Title'
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          className={inputClass}
        />
        <textarea
          placeholder='Message…'
          required
          rows={3}
          value={body}
          onChange={e => setBody(e.target.value)}
          className='w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary'
        />
        <label className='flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer'>
          <input
            type='checkbox'
            checked={pinned}
            onChange={e => setPinned(e.target.checked)}
            className='w-4 h-4 accent-primary'
          />
          Pin announcement
        </label>

        {isOrgAdmin && (
          <div className='flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm'>
            <button
              type='button'
              onClick={() => setAllHomes(false)}
              className={`flex-1 py-2 transition-colors ${!allHomes ? 'bg-primary text-white font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            >
              This home
            </button>
            <button
              type='button'
              onClick={() => setAllHomes(true)}
              className={`flex-1 py-2 transition-colors ${allHomes ? 'bg-primary text-white font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            >
              All homes
            </button>
          </div>
        )}

        {error && <p className='text-xs text-red-500 dark:text-red-400'>{error}</p>}

        <div className='flex gap-2 pt-1'>
          <button
            type='button'
            onClick={() => { setOpen(false); setTitle(''); setBody(''); setError(null) }}
            className='flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg py-2.5 text-sm text-zinc-600 dark:text-zinc-400 min-h-[44px] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={posting || !title.trim() || !body.trim()}
            className='flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px] hover:bg-primary/90 disabled:opacity-50 transition-colors'
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}
