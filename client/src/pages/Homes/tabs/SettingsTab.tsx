import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Save, AlertTriangle } from 'lucide-react'
import { updateHome, archiveHome, type Home } from '../../../api/homes'
import ConfirmDialog from '../../../components/ConfirmDialog'

interface Props {
  home: Home
  onUpdate: () => void
}

export default function SettingsTab({ home, onUpdate }: Props) {
  const navigate = useNavigate()

  const [name, setName] = useState(home.name)
  const [address, setAddress] = useState(home.address ?? '')
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasChanges = name !== home.name || address !== (home.address ?? '')

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await updateHome(home.id, { name: name.trim(), address: address.trim() || undefined })
      setSuccess(true)
      onUpdate()
      setTimeout(() => setSuccess(false), 3000)
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
      navigate('/homes', { replace: true })
    } catch {
      setArchiving(false)
      setShowArchiveConfirm(false)
    }
  }

  return (
    <div className='p-4 space-y-4'>
      {/* Form */}
      <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4'>
        <h2 className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
          Home Details
        </h2>

        {/* Name */}
        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
            Name
          </label>
          <input
            type='text'
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder='Enter home name'
            className='w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]'
          />
        </div>

        {/* Address */}
        <div>
          <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
            Address
          </label>
          <input
            type='text'
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder='Enter address'
            className='w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]'
          />
        </div>

        {/* Error */}
        {error && (
          <p className='text-sm text-red-500'>{error}</p>
        )}

        {/* Success */}
        {success && (
          <p className='text-sm text-emerald-500'>Changes saved successfully!</p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className='w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-3 rounded-md min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <Save className='h-4 w-4' />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Danger zone */}
      <div className='bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/40 rounded-lg p-4 space-y-3'>
        <div className='flex items-center gap-2'>
          <AlertTriangle className='h-4 w-4 text-red-500' />
          <h2 className='text-xs font-semibold uppercase tracking-wide text-red-500'>
            Danger Zone
          </h2>
        </div>

        <p className='text-sm text-zinc-600 dark:text-zinc-400'>
          Archiving this home will hide it from the active homes list. All associated data will be preserved but the home will no longer appear in dashboards or reports.
        </p>

        <button
          onClick={() => setShowArchiveConfirm(true)}
          disabled={archiving}
          className='w-full flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/40 text-red-500 text-sm font-semibold px-4 py-3 rounded-md min-h-[44px] disabled:opacity-50'
        >
          <Archive className='h-4 w-4' />
          {archiving ? 'Archiving...' : 'Archive Home'}
        </button>
      </div>

      {/* Archive confirmation dialog */}
      <ConfirmDialog
        open={showArchiveConfirm}
        title={`Archive ${home.name}?`}
        description='This will hide the home from active lists. All residents and staff assignments will be preserved.'
        confirmLabel='Archive'
        confirmVariant='destructive'
        onConfirm={() => { void handleArchive() }}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </div>
  )
}
