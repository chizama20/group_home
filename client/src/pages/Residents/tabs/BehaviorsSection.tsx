import { useState, useEffect, type FormEvent } from 'react'
import { getBehaviors, createBehavior, deleteBehavior } from '../../../api/residents'
import type { TrackedBehavior } from '../../../types/resident'

interface Props {
  residentId: string
}

export default function BehaviorsSection({ residentId }: Props) {
  const [behaviors, setBehaviors] = useState<TrackedBehavior[]>([])
  const [newName,   setNewName]   = useState('')
  const [adding,    setAdding]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  function load() {
    getBehaviors(residentId)
      .then(res => setBehaviors(res.data.data?.filter(b => b.is_active) ?? []))
      .catch(() => {/* non-critical */})
  }

  useEffect(() => { load() }, [residentId])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError(null)
    try {
      await createBehavior(residentId, { name: newName.trim() })
      setNewName('')
      load()
    } catch {
      setError('Failed to add behavior')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(behaviorId: string) {
    try {
      await deleteBehavior(residentId, behaviorId)
      load()
    } catch {/* ignore */}
  }

  return (
    <div className='bg-white rounded-xl shadow-sm overflow-hidden'>
      <div className='px-4 py-3 border-b border-gray-100'>
        <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wide'>Tracked Behaviors</h2>
      </div>

      {behaviors.length === 0 && (
        <p className='px-4 py-3 text-sm text-gray-400'>No behaviors tracked yet</p>
      )}

      {behaviors.map(b => (
        <div key={b.id} className='flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0'>
          <div className='min-w-0'>
            <p className='text-sm text-gray-900'>{b.name}</p>
            {b.description && (
              <p className='text-xs text-gray-400 mt-0.5'>{b.description}</p>
            )}
          </div>
          <button
            onClick={() => void handleDelete(b.id)}
            aria-label='Remove behavior'
            className='ml-3 shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors'
          >
            ×
          </button>
        </div>
      ))}

      <form onSubmit={e => { void handleAdd(e) }} className='flex gap-2 px-4 py-3 border-t border-gray-100'>
        <input
          type='text'
          placeholder='Add behavior…'
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
        <button
          type='submit'
          disabled={adding || !newName.trim()}
          className='bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium min-h-[40px] disabled:opacity-50'
        >
          Add
        </button>
      </form>
      {error && <p className='px-4 pb-3 text-xs text-red-600'>{error}</p>}
    </div>
  )
}
