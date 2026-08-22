import { useState } from 'react'
import { X, Archive, AlertTriangle } from 'lucide-react'
import { updateHome, archiveHome, type Home } from '../api/homes'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  home: Home
  onSuccess: () => void
  onCancel: () => void
  onArchived: () => void
}

export default function EditHomeSheet({ home, onSuccess, onCancel, onArchived }: Props) {
  const [name, setName] = useState(home.name)
  const [address, setAddress] = useState(home.address ?? '')
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanges = name !== home.name || address !== (home.address ?? '')
  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateHome(home.id, { name: name.trim(), address: address.trim() || undefined })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    setArchiving(true)
    try {
      await archiveHome(home.id)
      onArchived()
    } catch {
      setArchiving(false)
      setShowArchiveConfirm(false)
    }
  }

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onCancel} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 pb-8 max-h-[92vh] overflow-y-auto'>
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />

        <div className='px-4 pt-4'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-bold text-zinc-900 dark:text-white'>Edit Home</h2>
            <button
              onClick={onCancel}
              className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
            >
              <X className='w-5 h-5 text-zinc-500 dark:text-zinc-400' />
            </button>
          </div>

          <div className='space-y-4'>
            <div>
              <label className={labelClass}>Name</label>
              <input
                type='text'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='Enter home name'
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input
                type='text'
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder='Enter address'
                className={inputClass}
              />
            </div>

            {error && (
              <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg'>
                {error}
              </p>
            )}

            <button
              type='button'
              disabled={saving || !hasChanges}
              onClick={() => { void handleSave() }}
              className='w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold min-h-[44px] hover:bg-primary/90 disabled:opacity-50 transition-colors'
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Danger zone */}
          <div className='mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 space-y-3'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='h-4 w-4 text-red-500' />
              <h3 className='text-xs font-semibold uppercase tracking-wide text-red-500'>Danger Zone</h3>
            </div>
            <p className='text-sm text-zinc-600 dark:text-zinc-400'>
              Archiving this home will hide it from active lists. All associated data is preserved.
            </p>
            <button
              type='button'
              disabled={archiving}
              onClick={() => setShowArchiveConfirm(true)}
              className='w-full flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/40 text-red-500 text-sm font-semibold px-4 py-3 rounded-xl min-h-[44px] disabled:opacity-50'
            >
              <Archive className='h-4 w-4' />
              {archiving ? 'Archiving...' : 'Archive Home'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showArchiveConfirm}
        title={`Archive ${home.name}?`}
        description='This will hide the home from active lists. All residents and staff assignments will be preserved.'
        confirmLabel='Archive'
        confirmVariant='destructive'
        onConfirm={() => { void handleArchive() }}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </>
  )
}
