import { useState } from 'react'
import type { Announcement } from '../../types/log'

interface Props {
  announcements: Announcement[]
}

export default function AnnouncementBanner({ announcements }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!announcements.length) return null

  const ann = [...announcements].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })[0]

  const isLong = ann.body.length > 200

  return (
    <div className='mx-4 mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4'>
      <p className='text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1'>From Management</p>
      {ann.title && (
        <p className='text-sm font-semibold text-gray-900 mb-1'>{ann.title}</p>
      )}
      <p className={`text-sm text-gray-700 leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
        {ann.body}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className='text-xs font-semibold text-blue-600 mt-2 min-h-[44px] flex items-center'
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
