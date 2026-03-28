import { useState } from 'react'
import api from '../../api/client'
import type { Resident } from '../../types/resident'
import { todayStr } from '../../utils/date'
import { cn } from '../../lib/cn'

type ExportType = 'mar' | 'ipos' | 'incidents' | 'behavioral'

const TYPES: { id: ExportType; label: string; description: string }[] = [
  { id: 'mar',        label: 'MAR',              description: 'Medication administration records' },
  { id: 'ipos',       label: 'IPOS Logs',        description: 'Individual plan of services logs' },
  { id: 'incidents',  label: 'Incident Report',  description: 'Filed incident reports' },
  { id: 'behavioral', label: 'Behavioral Logs',  description: 'Behavioral tracking entries' },
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
  const [type, setType]           = useState<ExportType>('ipos')
  const [dateFrom, setDateFrom]   = useState(todayStr())
  const [dateTo, setDateTo]       = useState(todayStr())
  const [residentId, setResidentId] = useState('')
  const [exporting, setExporting] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const active = residents.filter(r => r.is_active)

  const requiresResident = type === 'mar'
  const supportsResident = type === 'ipos' || type === 'behavioral'

  const canExport =
    dateFrom && dateTo &&
    (!requiresResident || residentId)

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

  return (
    <>
      <div className='fixed inset-0 bg-black/40 z-40' onClick={onClose} />
      <div className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[90vh] flex flex-col'>
        <div className='w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 shrink-0' />

        <div className='px-4 pt-3 pb-2 border-b border-gray-100 shrink-0 flex items-center justify-between'>
          <p className='text-base font-semibold text-gray-900'>Export PDF</p>
          <button
            onClick={onClose}
            className='text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl'
          >
            ✕
          </button>
        </div>

        <div className='overflow-y-auto flex-1 px-4 py-4 pb-8 space-y-4'>

          {/* Type selector */}
          <div className='space-y-2'>
            {TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => { setType(t.id); setResidentId('') }}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border transition-colors min-h-[56px]',
                  type === t.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                )}
              >
                <p className={cn('text-sm font-semibold', type === t.id ? 'text-blue-700' : 'text-gray-900')}>
                  {t.label}
                </p>
                <p className='text-xs text-gray-400 mt-0.5'>{t.description}</p>
              </button>
            ))}
          </div>

          {/* Resident selector */}
          {(requiresResident || supportsResident) && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Resident {requiresResident && <span className='text-red-500'>*</span>}
                {!requiresResident && <span className='text-gray-400 font-normal ml-1'>(optional)</span>}
              </label>
              <select
                value={residentId}
                onChange={e => setResidentId(e.target.value)}
                className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm min-h-[44px] bg-white'
              >
                <option value=''>
                  {requiresResident ? 'Select resident…' : 'All residents'}
                </option>
                {active.map(r => (
                  <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs text-gray-500 mb-1'>From</label>
              <input
                type='date'
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm min-h-[44px]'
              />
            </div>
            <div>
              <label className='block text-xs text-gray-500 mb-1'>To</label>
              <input
                type='date'
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm min-h-[44px]'
              />
            </div>
          </div>

          {error && (
            <p className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'>{error}</p>
          )}

          <button
            onClick={() => { void handleExport() }}
            disabled={!canExport || exporting}
            className='w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50'
          >
            {exporting ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </>
  )
}
