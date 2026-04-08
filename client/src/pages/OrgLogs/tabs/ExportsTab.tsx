import { useState } from 'react'
import { Download, FileSpreadsheet, Calendar, Building2, Check } from 'lucide-react'
import type { Home } from '../../../api/homes'
import { exportCsv } from '../../../api/orgs'
import { cn } from '../../../lib/cn'
import { todayStr } from '../../../utils/date'

type DataType = 'incidents' | 'ipos' | 'medications'

const DATA_TYPES: { id: DataType; label: string; description: string }[] = [
  { id: 'incidents', label: 'Incidents', description: 'Incident reports and sign-offs' },
  { id: 'ipos', label: 'IPOS Logs', description: 'Individual plan of services logs' },
  { id: 'medications', label: 'Medications', description: 'Medication administration records' },
]

interface Props {
  selectedHomeId: string
  homes: Home[]
}

export default function ExportsTab({ selectedHomeId, homes }: Props) {
  const [selectedTypes, setSelectedTypes] = useState<Set<DataType>>(new Set(['incidents']))
  const [homeFilter, setHomeFilter] = useState<string>(selectedHomeId)
  const [dateFrom, setDateFrom] = useState(todayStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  // Sync home filter when parent changes
  if (selectedHomeId !== 'all' && homeFilter === 'all') {
    setHomeFilter(selectedHomeId)
  }

  function toggleDataType(type: DataType) {
    const newSet = new Set(selectedTypes)
    if (newSet.has(type)) {
      if (newSet.size > 1) {
        newSet.delete(type)
      }
    } else {
      newSet.add(type)
    }
    setSelectedTypes(newSet)
  }

  async function handleDownload() {
    if (selectedTypes.size === 0) return
    setExporting(true)
    setExportSuccess(false)
    try {
      for (const type of selectedTypes) {
        const res = await exportCsv({
          type,
          home_id:   homeFilter !== 'all' ? homeFilter : undefined,
          date_from: dateFrom || undefined,
          date_to:   dateTo   || undefined,
        })
        const csv      = typeof res.data === 'string' ? res.data : ''
        const blob     = new Blob([csv], { type: 'text/csv' })
        const url      = URL.createObjectURL(blob)
        const a        = document.createElement('a')
        a.href         = url
        a.download     = `${type}_export_${dateFrom}_${dateTo}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
      setExportSuccess(true)
    } catch {
      /* non-critical — browser will show no download */
    } finally {
      setExporting(false)
    }
  }

  const canExport = selectedTypes.size > 0 && dateFrom && dateTo

  return (
    <div className='pb-4'>
      {/* Header */}
      <div className='px-4 pt-4 pb-2'>
        <div className='flex items-center gap-2'>
          <FileSpreadsheet size={16} className='text-zinc-400' />
          <h2 className='text-sm font-semibold text-zinc-900 dark:text-white'>
            Export Data
          </h2>
        </div>
        <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
          Select data types and filters to generate a CSV export
        </p>
      </div>

      {/* Data type toggles */}
      <div className='px-4 pt-4'>
        <label className='block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2'>
          Data Type
        </label>
        <div className='flex flex-wrap gap-2'>
          {DATA_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => toggleDataType(type.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border min-h-[40px] transition-all',
                selectedTypes.has(type.id)
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
              )}
            >
              {selectedTypes.has(type.id) && (
                <Check size={14} className='text-indigo-500' />
              )}
              {type.label}
            </button>
          ))}
        </div>
        <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-2'>
          {selectedTypes.size > 0
            ? `Selected: ${Array.from(selectedTypes).map(t => DATA_TYPES.find(d => d.id === t)?.label).join(', ')}`
            : 'Select at least one data type'}
        </p>
      </div>

      {/* Home filter */}
      <div className='px-4 pt-4'>
        <label className='block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2'>
          <span className='flex items-center gap-1.5'>
            <Building2 size={12} />
            Home
          </span>
        </label>
        <select
          value={homeFilter}
          onChange={e => setHomeFilter(e.target.value)}
          className='w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
        >
          <option value='all'>All Homes</option>
          {homes.map(home => (
            <option key={home.id} value={home.id}>{home.name}</option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div className='px-4 pt-4'>
        <label className='block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2'>
          <span className='flex items-center gap-1.5'>
            <Calendar size={12} />
            Date Range
          </span>
        </label>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='block text-xs text-zinc-500 dark:text-zinc-400 mb-1'>From</label>
            <input
              type='date'
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
            />
          </div>
          <div>
            <label className='block text-xs text-zinc-500 dark:text-zinc-400 mb-1'>To</label>
            <input
              type='date'
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className='w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'
            />
          </div>
        </div>
      </div>

      {/* Export summary */}
      <div className='px-4 pt-6'>
        <div className='bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4'>
          <p className='text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2'>
            Export Summary
          </p>
          <ul className='space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400'>
            <li className='flex items-center gap-2'>
              <span className='w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0' />
              <span>
                <strong className='text-zinc-900 dark:text-white'>
                  {selectedTypes.size}
                </strong> data type{selectedTypes.size !== 1 ? 's' : ''} selected
              </span>
            </li>
            <li className='flex items-center gap-2'>
              <span className='w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0' />
              <span>
                Home: <strong className='text-zinc-900 dark:text-white'>
                  {homeFilter === 'all' ? 'All homes' : homes.find(h => h.id === homeFilter)?.name ?? 'Selected home'}
                </strong>
              </span>
            </li>
            <li className='flex items-center gap-2'>
              <span className='w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0' />
              <span>
                Date range: <strong className='text-zinc-900 dark:text-white'>
                  {dateFrom} to {dateTo}
                </strong>
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Download button */}
      <div className='px-4 pt-4'>
        <button
          onClick={() => { void handleDownload() }}
          disabled={!canExport || exporting}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold min-h-[44px] transition-colors',
            'bg-indigo-600 text-white hover:bg-indigo-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Download size={16} />
          {exporting ? 'Generating CSV...' : 'Download CSV'}
        </button>
      </div>

      {/* Success */}
      {exportSuccess && (
        <div className='mx-4 mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3'>
          <p className='text-sm font-medium text-emerald-400'>Download started.</p>
          <p className='text-xs text-emerald-400/70 mt-0.5'>Check your downloads folder.</p>
        </div>
      )}

      {/* Help text */}
      <div className='px-4 pt-4'>
        <p className='text-xs text-zinc-400 dark:text-zinc-500 text-center'>
          CSV exports include all records matching your filters.
          Large exports may take a moment to generate.
        </p>
      </div>
    </div>
  )
}
