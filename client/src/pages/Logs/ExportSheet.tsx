import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../../api/client'
import type { Resident } from '../../types/resident'
import { todayStr } from '../../utils/date'
import { cn } from '../../lib/cn'

type ExportType = 'mar' | 'ipos' | 'incidents' | 'behavioral'

const TYPES: { id: ExportType; label: string; description: string }[] = [
  { id: 'mar',        label: 'MAR',             description: 'Medication administration records' },
  { id: 'ipos',       label: 'IPOS Logs',       description: 'Individual plan of services logs' },
  { id: 'incidents',  label: 'Incident Report', description: 'Filed incident reports' },
  { id: 'behavioral', label: 'Behavioral Logs', description: 'Behavioral tracking entries' },
]

async function downloadPdf(
  path: string,
  params: Record<string, string>,
  filename: string
) {
  const res = await api.get(path, { params, responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }))
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  homeId:    string
  residents: Resident[]
  onClose:   () => void
}

export default function ExportSheet({ homeId, residents, onClose }: Props) {
  const [type, setType]             = useState<ExportType>('ipos')
  const [dateFrom, setDateFrom]     = useState(todayStr())
  const [dateTo, setDateTo]         = useState(todayStr())
  const [residentId, setResidentId] = useState('')
  const [exporting, setExporting]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const active = residents.filter(r => r.is_active)

  const requiresResident = type === 'mar'
  const supportsResident = type === 'ipos' || type === 'behavioral'

  const canExport = dateFrom && dateTo && (!requiresResident || residentId)

  async function handleExport() {
    if (!canExport) return
    setExporting(true)
    setError(null)
    try {
      const params: Record<string, string> = { date_from: dateFrom, date_to: dateTo }
      if (type === 'mar') {
        params.resident_id = residentId
      } else {
        params.home_id = homeId
        if (supportsResident && residentId) params.resident_id = residentId
      }
      await downloadPdf(`/exports/${type}`, params, `${type}_export_${dateFrom}_${dateTo}.pdf`)
    } catch {
      setError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const inputClass = 'w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <>
      <div className='fixed inset-0 bg-black/40 z-40' onClick={onClose} />
      <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-xl md:rounded-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 max-h-[90vh] flex flex-col'>
        <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 shrink-0 md:hidden' />

        <div className='px-4 pt-3 pb-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-between'>
          <p className='text-base font-semibold text-zinc-900 dark:text-white'>Export PDF</p>
          <button
            onClick={onClose}
            className='text-zinc-400 dark:text-zinc-500 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='overflow-y-auto flex-1 px-4 py-4 pb-8 space-y-4'>

          <div className='space-y-2'>
            {TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => { setType(t.id); setResidentId('') }}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border transition-colors min-h-[56px]',
                  type === t.id
                    ? 'border-primary bg-primary dark:bg-primary/10'
                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50'
                )}
              >
                <p className={cn('text-sm font-semibold', type === t.id ? 'text-primary dark:text-primary' : 'text-zinc-900 dark:text-white')}>
                  {t.label}
                </p>
                <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-0.5'>{t.description}</p>
              </button>
            ))}
          </div>

          {(requiresResident || supportsResident) && (
            <div>
              <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
                Resident {requiresResident && <span className='text-red-500'>*</span>}
                {!requiresResident && <span className='text-zinc-400 dark:text-zinc-500 font-normal ml-1'>(optional)</span>}
              </label>
              <select value={residentId} onChange={e => setResidentId(e.target.value)} className={inputClass}>
                <option value=''>
                  {requiresResident ? 'Select resident…' : 'All residents'}
                </option>
                {active.map(r => (
                  <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs text-zinc-500 dark:text-zinc-400 mb-1'>From</label>
              <input type='date' value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className='block text-xs text-zinc-500 dark:text-zinc-400 mb-1'>To</label>
              <input type='date' value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputClass} />
            </div>
          </div>

          {error && (
            <p className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg'>{error}</p>
          )}

          <button
            onClick={() => { void handleExport() }}
            disabled={!canExport || exporting}
            className='w-full bg-primary text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] hover:bg-primary disabled:opacity-50 transition-colors'
          >
            {exporting ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </>
  )
}
