import { useState, useRef, useEffect } from 'react'
import type { Resident } from '../../types/resident'
import { cn } from '../../lib/cn'

interface Props {
  residents:   Resident[]
  submitting:  boolean
  onPost:      (content: string, residentId: string | null, flagged: boolean) => Promise<void>
}

export default function ComposeBar({ residents, submitting, onPost }: Props) {
  const [text, setText]             = useState('')
  const [residentId, setResidentId] = useState<string | null>(null)
  const [flagged, setFlagged]       = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  const canPost = text.trim().length > 0 && !submitting

  async function handlePost() {
    if (!canPost) return
    await onPost(text.trim(), residentId, flagged)
    setText('')
    setResidentId(null)
    setFlagged(false)
  }

  const selectedResident = residents.find(r => r.id === residentId)

  return (
    <div className='fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-30'>
      {/* Chips row */}
      <div className='flex items-center gap-2 px-3 pt-2'>
        {/* Resident tag chip */}
        <button
          onClick={() => setShowPicker(p => !p)}
          className={cn(
            'text-xs px-3 py-1.5 rounded-full border font-medium shrink-0',
            residentId
              ? 'bg-blue-600 text-white border-blue-600'
              : 'text-gray-500 border-gray-300 bg-white'
          )}
        >
          {selectedResident
            ? `@${selectedResident.first_name} ${selectedResident.last_name}`
            : '+ Tag resident'}
        </button>

        {/* Flagged chip */}
        <button
          onClick={() => setFlagged(f => !f)}
          className={cn(
            'text-xs px-3 py-1.5 rounded-full border font-medium shrink-0',
            flagged
              ? 'bg-red-600 text-white border-red-600'
              : 'text-gray-500 border-gray-300 bg-white'
          )}
        >
          {flagged ? 'Flagged' : 'Flag'}
        </button>
      </div>

      {/* Resident picker dropdown */}
      {showPicker && (
        <div className='mx-3 mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white max-h-40 overflow-y-auto'>
          {residentId && (
            <button
              onClick={() => { setResidentId(null); setShowPicker(false) }}
              className='w-full text-left px-4 py-2.5 text-sm text-red-600 border-b border-gray-100'
            >
              Remove tag
            </button>
          )}
          {residents.map(r => (
            <button
              key={r.id}
              onClick={() => { setResidentId(r.id); setShowPicker(false) }}
              className='w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-50 last:border-0'
            >
              {r.first_name} {r.last_name}
            </button>
          ))}
        </div>
      )}

      {/* Text input row */}
      <div className='flex items-end gap-2 px-3 pt-2 pb-3'>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder='Write a shift note…'
          rows={1}
          className='flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto'
        />
        <button
          onClick={() => { void handlePost() }}
          disabled={!canPost}
          className='bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px] disabled:opacity-40 shrink-0'
        >
          {submitting ? '…' : 'Post'}
        </button>
      </div>
    </div>
  )
}
