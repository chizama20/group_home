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
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
    setDeleteError(null)
    try {
      await deleteBehavior(residentId, behaviorId)
      load()
    } catch {
      setDeleteError('Failed to remove behavior')
    }
  }

  return (
    <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden'>
      <div className='px-4 py-3 border-b border-zinc-100 dark:border-zinc-800'>
        <h2 className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
          Tracked Behaviors
        </h2>
      </div>

      {behaviors.length === 0 && (
        <p className='px-4 py-3 text-sm text-zinc-400 dark:text-zinc-600'>No behaviors tracked yet</p>
      )}

      {behaviors.map(b => (
        <div key={b.id} className='flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 min-h-[52px]'>
          <div className='min-w-0'>
            <p className='text-sm text-zinc-900 dark:text-white'>{b.name}</p>
            {b.description && (
              <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-0.5'>{b.description}</p>
            )}
          </div>
          <button
            onClick={() => void handleDelete(b.id)}
            aria-label='Remove behavior'
            className='ml-3 shrink-0 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors'
          >
            ×
          </button>
        </div>
      ))}

      <form onSubmit={e => { void handleAdd(e) }} className='flex gap-2 px-4 py-3 border-t border-zinc-100 dark:border-zinc-800'>
        <input
          type='text'
          placeholder='Add behavior…'
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className='flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
        />
        <button
          type='submit'
          disabled={adding || !newName.trim()}
          className='bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-medium min-h-[40px] disabled:opacity-50'
        >
          Add
        </button>
      </form>
      {error && <p className='px-4 pb-3 text-xs text-red-400'>{error}</p>}
      {deleteError && <p className='px-4 pb-3 text-xs text-red-400'>{deleteError}</p>}
    </div>
  )
}
