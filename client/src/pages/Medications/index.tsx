import { useState, useEffect } from 'react'
import BottomNav from '../../components/BottomNav'
import { useSelectedHome } from '../../hooks/useSelectedHome'
import { useMedicationAdmin } from '../../hooks/useMedicationAdmin'
import { getHomeMedications, bulkAdminister } from '../../api/medications'
import type { Medication, MedicationOutcome } from '../../types/medication'
import { isSlotLocked } from '../../utils/medicationSlot'
import { cn } from '../../lib/cn'
import OutcomeScreen from './OutcomeScreen'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ResidentGroup {
  residentId: string
  name:       string
  meds:       Medication[]
}

interface SlotGroup {
  time:      string   // 'HH:MM' or 'Unscheduled'
  locked:    boolean
  residents: ResidentGroup[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSlotGroups(meds: Medication[]): SlotGroup[] {
  const slotMap = new Map<string, Map<string, ResidentGroup>>()

  for (const med of meds) {
    const slot     = med.scheduled_time ?? 'Unscheduled'
    const resId    = med.resident_id
    const resName  = med.first_name && med.last_name
      ? `${med.first_name} ${med.last_name}`
      : med.resident_id

    if (!slotMap.has(slot)) slotMap.set(slot, new Map())
    const resMap = slotMap.get(slot)!
    if (!resMap.has(resId)) resMap.set(resId, { residentId: resId, name: resName, meds: [] })
    resMap.get(resId)!.meds.push(med)
  }

  const groups: SlotGroup[] = []
  for (const [time, resMap] of slotMap.entries()) {
    groups.push({
      time,
      locked:    isSlotLocked(time === 'Unscheduled' ? null : time),
      residents: [...resMap.values()],
    })
  }

  // Sort: unlocked slots first (by time), then locked (upcoming), then Unscheduled
  return groups.sort((a, b) => {
    if (a.time === 'Unscheduled') return 1
    if (b.time === 'Unscheduled') return -1
    if (a.locked !== b.locked)    return a.locked ? 1 : -1
    return a.time.localeCompare(b.time)
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MedicationsPage() {
  const { homeId, homes, selectHome } = useSelectedHome()
  const [meds, setMeds]               = useState<Medication[]>([])
  const [loading, setLoading]         = useState(false)
  const [administeredIds, setAdministeredIds] = useState<Set<string>>(new Set())
  const [failedIds, setFailedIds]     = useState<Set<string>>(new Set())
  const [showOutcome, setShowOutcome] = useState(false)

  const { selectedIds, toggle, selectAll, deselectAll, clearAll, isSelected, countFor } = useMedicationAdmin()

  useEffect(() => {
    if (!homeId) return
    setLoading(true)
    getHomeMedications(homeId)
      .then(res => setMeds(res.data.data?.filter(m => m.is_active) ?? []))
      .catch(() => {/* non-critical */})
      .finally(() => setLoading(false))
  }, [homeId])

  const slots = buildSlotGroups(meds)

  async function handleAdminister(outcome: MedicationOutcome, notes: string) {
    const ids = [...selectedIds]
    const res = await bulkAdminister({ medication_ids: ids, outcome, notes: notes || undefined })
    const results = res.data.data?.results ?? []

    const succeeded = new Set<string>()
    const failed    = new Set<string>()
    for (const r of results) {
      if (r.status === 'ok') succeeded.add(r.medication_id)
      else                   failed.add(r.medication_id)
    }

    setAdministeredIds(prev => new Set([...prev, ...succeeded]))
    setFailedIds(prev => new Set([...prev, ...failed]))
    clearAll()
    setShowOutcome(false)
  }

  const totalSelected = selectedIds.size

  return (
    <div className='pb-32 min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white px-4 pt-5 pb-3 border-b border-gray-100'>
        <h1 className='text-xl font-bold text-gray-900 mb-3'>Medications</h1>
        {homes.length > 1 && (
          <select
            value={homeId ?? ''}
            onChange={e => selectHome(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white'
          >
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {loading && <p className='p-4 text-sm text-gray-500'>Loading…</p>}
      {!loading && !meds.length && homeId && (
        <p className='p-4 text-sm text-gray-500'>No active medications scheduled</p>
      )}

      {/* Slot groups */}
      {slots.map(slot => (
        <div key={slot.time} className='mt-3'>
          {/* Slot header */}
          <div className={cn(
            'px-4 py-2 flex items-center gap-2',
            slot.locked ? 'bg-gray-100' : 'bg-white border-b border-gray-100'
          )}>
            {slot.locked && <span className='text-base'>🔒</span>}
            <span className={cn(
              'text-sm font-semibold',
              slot.locked ? 'text-gray-400' : 'text-gray-800'
            )}>
              {slot.time}
            </span>
            {slot.locked && (
              <span className='text-xs text-gray-400 ml-1'>Not yet due</span>
            )}
          </div>

          {/* Resident groups within slot */}
          {slot.residents.map(group => {
            const medIds      = group.meds.map(m => m.id)
            const selected    = countFor(medIds)
            const allSelected = selected === medIds.length
            const btnLabel    = selected === 0 ? 'Give all' : `Give ${selected}`

            return (
              <div key={group.residentId} className='bg-white mb-px'>
                {/* Resident header row */}
                <div className={cn(
                  'flex items-center gap-3 px-4 py-2 border-b border-gray-50',
                  slot.locked ? 'opacity-40' : ''
                )}>
                  <button
                    disabled={slot.locked}
                    onClick={() => allSelected ? deselectAll(medIds) : selectAll(medIds)}
                    className='flex items-center gap-3 flex-1 min-h-[44px] text-left disabled:pointer-events-none'
                  >
                    <div className='w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0'>
                      {group.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className='text-sm font-semibold text-gray-900'>{group.name}</span>
                  </button>
                  {!slot.locked && (
                    <button
                      onClick={() => allSelected ? deselectAll(medIds) : selectAll(medIds)}
                      className={cn(
                        'text-xs font-semibold px-3 py-1.5 rounded-lg border min-h-[36px] shrink-0',
                        selected > 0
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'text-blue-600 border-blue-200 bg-blue-50'
                      )}
                    >
                      {btnLabel}
                    </button>
                  )}
                </div>

                {/* Individual med rows */}
                {group.meds.map(med => {
                  const done   = administeredIds.has(med.id)
                  const failed = failedIds.has(med.id)

                  return (
                    <button
                      key={med.id}
                      disabled={slot.locked || done}
                      onClick={() => !done && toggle(med.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 text-left min-h-[56px]',
                        slot.locked || done ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50'
                      )}
                    >
                      {/* Checkbox */}
                      <div className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        done              ? 'bg-green-500 border-green-500' :
                        failed            ? 'bg-red-200 border-red-400' :
                        isSelected(med.id) ? 'bg-blue-600 border-blue-600' :
                                            'border-gray-300 bg-white'
                      )}>
                        {done               && <span className='text-white text-xs font-bold'>✓</span>}
                        {!done && isSelected(med.id) && <span className='text-white text-xs font-bold'>✓</span>}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <p className={cn(
                          'text-sm font-medium truncate',
                          done ? 'text-gray-400 line-through' : 'text-gray-900'
                        )}>
                          {med.name}
                        </p>
                        <p className='text-xs text-gray-500 mt-0.5 truncate'>
                          {med.dosage} · {med.frequency}
                          {failed && <span className='text-red-500 ml-2'>Failed to record</span>}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      ))}

      <BottomNav />

      {/* Sticky action bar */}
      {totalSelected > 0 && (
        <div className='fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 z-30'>
          <p className='flex-1 text-sm font-medium text-gray-700'>
            {totalSelected} med{totalSelected !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={() => setShowOutcome(true)}
            className='bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl min-h-[44px]'
          >
            Administer
          </button>
        </div>
      )}

      {/* Outcome screen */}
      {showOutcome && (
        <OutcomeScreen
          selectedCount={totalSelected}
          onConfirm={handleAdminister}
          onCancel={() => setShowOutcome(false)}
        />
      )}
    </div>
  )
}
