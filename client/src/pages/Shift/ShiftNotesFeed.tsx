import type { ShiftNote } from '../../types/log'
import { formatTime } from '../../utils/date'
import { cn } from '../../lib/cn'

interface Props {
  currentNotes:  ShiftNote[]
  previousNotes: ShiftNote[]
  loading:       boolean
}

function NoteCard({ note }: { note: ShiftNote }) {
  const authorName = note.first_name && note.last_name
    ? `${note.first_name} ${note.last_name}`
    : 'Staff'
  const residentName = note.resident_first && note.resident_last
    ? `${note.resident_first} ${note.resident_last}`
    : null

  return (
    <div className={cn(
      'bg-white rounded-xl px-4 py-3 shadow-sm',
      note.flagged && 'border-l-4 border-red-500'
    )}>
      <div className='flex items-center gap-2 mb-1'>
        {note.flagged && (
          <span className='text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full'>Flagged</span>
        )}
        <span className='text-xs font-semibold text-gray-700'>{authorName}</span>
        <span className='text-xs text-gray-400 ml-auto'>{formatTime(note.created_at)}</span>
      </div>
      <p className='text-sm text-gray-800 whitespace-pre-wrap'>{note.content}</p>
      {residentName && (
        <span className='mt-2 inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full'>
          {residentName}
        </span>
      )}
    </div>
  )
}

export default function ShiftNotesFeed({ currentNotes, previousNotes, loading }: Props) {
  if (loading) {
    return <p className='px-4 py-3 text-sm text-gray-500'>Loading notes…</p>
  }

  return (
    <div className='space-y-2'>
      {currentNotes.length === 0 && (
        <p className='px-4 text-sm text-gray-400'>No notes this shift yet.</p>
      )}
      {[...currentNotes].reverse().map(note => (
        <NoteCard key={note.id} note={note} />
      ))}

      {previousNotes.length > 0 && (
        <>
          <div className='flex items-center gap-3 py-2'>
            <div className='flex-1 h-px bg-gray-200' />
            <span className='text-xs text-gray-400 font-medium'>Previous shift</span>
            <div className='flex-1 h-px bg-gray-200' />
          </div>
          {[...previousNotes].reverse().slice(0, 5).map(note => (
            <NoteCard key={note.id} note={note} />
          ))}
        </>
      )}
    </div>
  )
}
