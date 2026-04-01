import { useState, useEffect } from 'react'
import { useSelectedHome } from '../../hooks/useSelectedHome'
import { useMedicationAdmin } from '../../hooks/useMedicationAdmin'
import { getHomeMedications, bulkAdminister } from '../../api/medications'
import type { Medication, MedicationOutcome } from '../../types/medication'
import { isSlotLocked } from '../../utils/medicationSlot'
import { cn } from '../../lib/cn'
import { Skeleton } from '../../components/ui/skeleton'
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
  const [error, setError]             = useState<string | null>(null)
  const [administeredIds, setAdministeredIds] = useState<Set<string>>(new Set())
  const [failedIds, setFailedIds]     = useState<Set<string>>(new Set())
  const [showOutcome, setShowOutcome] = useState(false)

  const { selectedIds, toggle, selectAll, deselectAll, clearAll, isSelected, countFor } = useMedicationAdmin()

  useEffect(() => {
    if (!homeId) return
    setLoading(true)
    setError(null)
    getHomeMedications(homeId)
      .then(res => setMeds(res.data.data?.filter(m => m.is_active) ?? []))
      .catch(() => setError('Failed to load medications. Please try again.'))
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
    <div className='pb-32 min-h-screen bg-background'>
      {/* Header */}
      <div className='bg-card px-4 pt-5 pb-3 border-b border-border'>
        <h1 className='text-xl font-bold text-foreground mb-3'>Medications</h1>
        {homes.length > 1 && (
          <select
            value={homeId ?? ''}
            onChange={e => selectHome(e.target.value)}
            className='w-full border border-border rounded-lg px-3 py-2 text-sm min-h-[44px] bg-card'
          >
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {loading && (
        <div className='p-4 space-y-4'>
          {[...Array(3)].map((_, i) => (
            <div key={i} className='bg-white rounded-xl p-4 space-y-3'>
              <Skeleton className='h-4 w-24' />
              {[...Array(2)].map((_, j) => (
                <div key={j} className='flex items-center gap-3'>
                  <Skeleton className='w-5 h-5 rounded' />
                  <div className='flex-1 space-y-1.5'>
                    <Skeleton className='h-4 w-36' />
                    <Skeleton className='h-3 w-48' />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {error && <p className='p-4 text-sm text-red-600'>{error}</p>}
      {!loading && !error && !meds.length && homeId && (
        <div className='flex flex-col items-center justify-center py-16 px-4 text-center'>
          <div className='w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3'>
            <span className='text-2xl'>💊</span>
          </div>
          <p className='text-sm font-medium text-gray-700'>No medications scheduled</p>
          <p className='text-xs text-gray-400 mt-1'>Add medications from a resident's profile</p>
        </div>
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
              <div key={group.residentId} className='bg-card mb-px'>
                {/* Resident header row */}
                <div className={cn(
                  'flex items-center gap-3 px-4 py-2 border-b border-border/50',
                  slot.locked ? 'opacity-40' : ''
                )}>
                  <button
                    disabled={slot.locked}
                    onClick={() => allSelected ? deselectAll(medIds) : selectAll(medIds)}
                    className='flex items-center gap-3 flex-1 min-h-[44px] text-left disabled:pointer-events-none'
                  >
                    <div className='w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0'>
                      {group.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className='text-sm font-semibold text-foreground'>{group.name}</span>
                  </button>
                  {!slot.locked && (
                    <button
                      onClick={() => allSelected ? deselectAll(medIds) : selectAll(medIds)}
                      className={cn(
                        'text-xs font-semibold px-3 py-1.5 rounded-lg border min-h-[36px] shrink-0',
                        selected > 0
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'text-primary border-primary/30 bg-primary/5'
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
                        'w-full flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 text-left min-h-[56px]',
                        slot.locked || done ? 'opacity-50 pointer-events-none' : 'hover:bg-muted'
                      )}
                    >
                      {/* Checkbox */}
                      <div className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        done              ? 'bg-green-500 border-green-500' :
                        failed            ? 'bg-red-200 border-red-400' :
                        isSelected(med.id) ? 'bg-primary border-primary' :
                                            'border-border bg-card'
                      )}>
                        {done               && <span className='text-white text-xs font-bold'>✓</span>}
                        {!done && isSelected(med.id) && <span className='text-white text-xs font-bold'>✓</span>}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <p className={cn(
                          'text-sm font-medium truncate',
                          done ? 'text-muted-foreground line-through' : 'text-foreground'
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

      {/* Sticky action bar */}
      {totalSelected > 0 && (
        <div className='fixed bottom-16 left-0 right-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3 z-30'>
          <p className='flex-1 text-sm font-medium text-foreground'>
            {totalSelected} med{totalSelected !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={() => setShowOutcome(true)}
            className='bg-primary text-primary-foreground text-sm font-semibold px-6 py-2.5 rounded-xl min-h-[44px]'
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
