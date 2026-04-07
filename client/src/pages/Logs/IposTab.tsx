import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, CheckCircle2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { getHomeIposLogs, contributeIposEntry } from '../../api/logs'
import { getGoals } from '../../api/residents'
import type { IposLog, IposEntry, Shift } from '../../types/log'
import { SHIFT_LABELS } from '../../types/log'
import type { Resident, ResidentGoal } from '../../types/resident'
import { todayStr } from '../../utils/date'
import { cn } from '../../lib/cn'
import { useRole } from '../../utils/role'
import IposCompliancePanel from './IposCompliancePanel'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EntryDraft {
  goal_id: string
  code: string
  label: string
  task_id_code: string
  cls_minutes: string
  pc_minutes: string
  progress_code: string
  narrative: string
}

const PROGRESS_CODES = [
  { value: 'A',  label: 'A — Achieved' },
  { value: 'I',  label: 'I — Improvement' },
  { value: 'N',  label: 'N — No Change' },
  { value: 'R',  label: 'R — Regression' },
  { value: 'NP', label: 'NP — Not Performed' },
  { value: 'NA', label: 'NA — Not Applicable' },
]

const SHIFTS: Shift[] = ['am', 'pm', 'mn']

function storedShift(): Shift {
  const today = todayStr()
  try {
    const raw = localStorage.getItem(`shift_selected_${today}`)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed[0] as Shift) ?? 'am'
      }
    }
  } catch {
    // ignore
  }
  return 'am'
}

function isDraftEmpty(d: EntryDraft): boolean {
  return !d.task_id_code.trim() &&
    !d.cls_minutes.trim() &&
    !d.pc_minutes.trim() &&
    !d.progress_code &&
    !d.narrative.trim()
}

function makeGoalDraft(goal: ResidentGoal): EntryDraft {
  return {
    goal_id: goal.id,
    code: goal.code,
    label: goal.description ?? goal.code,
    task_id_code: '',
    cls_minutes: '',
    pc_minutes: '',
    progress_code: '',
    narrative: '',
  }
}

// ── Other entries read-only section ──────────────────────────────────────────

interface OtherEntriesProps {
  entries: IposEntry[]
}

function OtherEntries({ entries }: OtherEntriesProps) {
  const [open, setOpen] = useState(false)
  if (entries.length === 0) return null

  return (
    <div className='mx-4 mb-4'>
      <button
        onClick={() => setOpen(v => !v)}
        className='w-full flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm font-medium text-zinc-400 min-h-[44px]'
      >
        <span>Other entries today ({entries.length})</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className='mt-2 space-y-2'>
          {entries.map(e => (
            <div key={e.id} className='bg-zinc-800/40 border border-zinc-700/40 rounded-xl px-4 py-3'>
              <div className='flex items-center gap-2 mb-1.5 flex-wrap'>
                {/* Staff chip */}
                <span className='bg-zinc-700 text-zinc-300 text-[11px] font-semibold px-2 py-0.5 rounded-full'>
                  {e.staff_first ?? '?'} {e.staff_last ?? ''}
                </span>
                {/* Shift badge */}
                <span className='bg-indigo-900/50 text-indigo-300 text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase'>
                  {e.shift}
                </span>
                {/* Goal code */}
                {e.goal_code && (
                  <span className='bg-zinc-700/60 text-zinc-400 text-[11px] px-2 py-0.5 rounded-full'>
                    {e.goal_code}
                  </span>
                )}
                {/* Progress code */}
                {e.progress_code && (
                  <span className='bg-zinc-600/40 text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-full'>
                    {e.progress_code}
                  </span>
                )}
              </div>
              {e.narrative && (
                <p className='text-xs text-zinc-400 line-clamp-2'>{e.narrative}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Goal row card ─────────────────────────────────────────────────────────────

interface GoalRowProps {
  draft: EntryDraft
  onChange: (updated: EntryDraft) => void
  goalType: 'cls' | 'pc'
}

function GoalRow({ draft, onChange, goalType }: GoalRowProps) {
  function set<K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) {
    onChange({ ...draft, [key]: value })
  }

  return (
    <div className='bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 mb-2'>
      {/* Header */}
      <div className='flex items-center gap-2 mb-3'>
        <span className={cn(
          'text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
          goalType === 'cls'
            ? 'bg-indigo-900/60 text-indigo-300'
            : 'bg-zinc-700 text-zinc-300'
        )}>
          {goalType.toUpperCase()} · {draft.code}
        </span>
        <span className='text-xs text-zinc-400 flex-1 truncate'>{draft.label}</span>
      </div>

      {/* Row 1: task code + minutes */}
      <div className='flex gap-2 mb-2'>
        <div className='flex-1'>
          <label className='block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide'>Task Code</label>
          <input
            type='text'
            value={draft.task_id_code}
            onChange={e => set('task_id_code', e.target.value)}
            placeholder='Task code'
            className='w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[36px]'
          />
        </div>
        <div className='w-20'>
          <label className='block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide'>CLS min</label>
          <input
            type='number'
            value={draft.cls_minutes}
            onChange={e => set('cls_minutes', e.target.value)}
            placeholder='0'
            min='0'
            className='w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[36px]'
          />
        </div>
        <div className='w-20'>
          <label className='block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide'>PC min</label>
          <input
            type='number'
            value={draft.pc_minutes}
            onChange={e => set('pc_minutes', e.target.value)}
            placeholder='0'
            min='0'
            className='w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[36px]'
          />
        </div>
      </div>

      {/* Row 2: progress select */}
      <div className='mb-2'>
        <label className='block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide'>Progress</label>
        <select
          value={draft.progress_code}
          onChange={e => set('progress_code', e.target.value)}
          className='w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[36px]'
        >
          <option value=''>— Select —</option>
          {PROGRESS_CODES.map(pc => (
            <option key={pc.value} value={pc.value}>{pc.label}</option>
          ))}
        </select>
      </div>

      {/* Row 3: narrative */}
      <div>
        <label className='block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide'>Notes</label>
        <textarea
          value={draft.narrative}
          onChange={e => set('narrative', e.target.value)}
          placeholder='Notes…'
          rows={2}
          className='w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none'
        />
      </div>
    </div>
  )
}

// ── Employee view ─────────────────────────────────────────────────────────────

interface EmployeeProps {
  homeId:       string
  residents:    Resident[]
  showFab:      boolean
  onFabHandled: () => void
}

function IposEmployeeView({ homeId, residents, showFab, onFabHandled }: EmployeeProps) {
  // ── Resident list state ──────────────────────────────────────────────────
  const [todayLogs, setTodayLogs]         = useState<IposLog[]>([])
  const [logsLoading, setLogsLoading]     = useState(false)

  // ── Form state ───────────────────────────────────────────────────────────
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [shift, setShift]                       = useState<Shift>(storedShift)
  const [residentGoals, setResidentGoals]       = useState<ResidentGoal[]>([])
  const [goalsLoading, setGoalsLoading]         = useState(false)
  const [entries, setEntries]                   = useState<EntryDraft[]>([])

  // Other entries (from the log for this resident today, by other staff)
  const [otherEntries, setOtherEntries]         = useState<IposEntry[]>([])

  // Submit state
  const [submitting, setSubmitting]   = useState(false)
  const [formError, setFormError]     = useState<string | null>(null)
  const [successIds, setSuccessIds]   = useState<Set<string>>(new Set())

  // ── Load today's logs ────────────────────────────────────────────────────
  const loadLogs = useCallback(() => {
    setLogsLoading(true)
    getHomeIposLogs(homeId, { date: todayStr() })
      .then(res => setTodayLogs(res.data.data ?? []))
      .catch(() => {/* non-critical */})
      .finally(() => setLogsLoading(false))
  }, [homeId])

  useEffect(() => { loadLogs() }, [loadLogs])

  // ── FAB: open first pending resident ────────────────────────────────────
  useEffect(() => {
    if (!showFab) return
    const active  = residents.filter(r => r.is_active)
    const filedIds = new Set(todayLogs.map(l => l.resident_id))
    const first   = active.find(r => !filedIds.has(r.id) && !successIds.has(r.id))
    if (first) openResidentForm(first)
    onFabHandled()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFab])

  // ── Derive filed status per resident ────────────────────────────────────
  //
  // "Filed" means: a log exists for today AND the current user has an entry
  // for the currently selected shift. We don't have per-entry data in the
  // list view (getHomeIposLogs doesn't include entries), so we use the
  // coarser rule: a log exists for that resident today = considered pending
  // unless successIds tracks a just-submitted one.
  function isFiledForResident(residentId: string): boolean {
    if (successIds.has(residentId)) return true
    return false
  }

  function hasPendingLog(residentId: string): boolean {
    return todayLogs.some(l => l.resident_id === residentId)
  }

  // ── Open form for a resident ─────────────────────────────────────────────
  function openResidentForm(r: Resident) {
    setSelectedResident(r)
    setFormError(null)
    setEntries([])
    setOtherEntries([])
    setResidentGoals([])
    setGoalsLoading(true)
    getGoals(r.id)
      .then(res => {
        const goals = (res.data.data ?? []).filter(g => g.is_active)
        setResidentGoals(goals)
        setEntries(goals.map(makeGoalDraft))
      })
      .catch(() => { setResidentGoals([]) })
      .finally(() => setGoalsLoading(false))
  }

  function closeForm() {
    setSelectedResident(null)
    setFormError(null)
  }

  // ── Update an entry draft ────────────────────────────────────────────────
  function updateEntry(idx: number, updated: EntryDraft) {
    setEntries(prev => prev.map((e, i) => i === idx ? updated : e))
  }

  // ── Submit all non-empty goal entries ────────────────────────────────────
  async function handleSubmit() {
    if (!selectedResident) return
    const toSubmit = entries.filter(e => !isDraftEmpty(e))
    if (toSubmit.length === 0) return

    setSubmitting(true)
    setFormError(null)
    try {
      for (const draft of toSubmit) {
        await contributeIposEntry(selectedResident.id, {
          shift,
          goal_id: draft.goal_id || undefined,
          task_id_code: draft.task_id_code.trim() || undefined,
          cls_minutes: draft.cls_minutes !== '' ? Number(draft.cls_minutes) : undefined,
          pc_minutes: draft.pc_minutes !== '' ? Number(draft.pc_minutes) : undefined,
          progress_code: draft.progress_code || undefined,
          narrative: draft.narrative.trim() || undefined,
        })
      }
      setSuccessIds(prev => new Set([...prev, selectedResident.id]))
      closeForm()
      loadLogs()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setFormError(e.response?.data?.error?.message ?? (err instanceof Error ? err.message : 'Failed to submit'))
    } finally {
      setSubmitting(false)
    }
  }

  const active = residents.filter(r => r.is_active)
  const clsGoals = residentGoals.filter(g => g.goal_type === 'cls')
  const pcGoals  = residentGoals.filter(g => g.goal_type === 'pc')
  const hasAnyContent = entries.some(e => !isDraftEmpty(e))

  // ── Resident list view ───────────────────────────────────────────────────
  if (!selectedResident) {
    return (
      <div>
        {/* Skeleton */}
        {logsLoading && (
          <div className='pt-2 px-4 space-y-2'>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className='bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-3 p-4 animate-pulse'>
                <div className='w-9 h-9 rounded-full bg-zinc-800 shrink-0' />
                <div className='h-4 flex-1 bg-zinc-800 rounded' />
                <div className='w-14 h-6 rounded-full bg-zinc-800' />
              </div>
            ))}
          </div>
        )}

        {!logsLoading && (
          <div className='px-4 pt-3 space-y-2'>
            {active.length === 0 && (
              <p className='p-4 text-sm text-zinc-500'>No active residents</p>
            )}
            {active.map(r => {
              const filed = isFiledForResident(r.id)
              const hasPending = hasPendingLog(r.id)
              return (
                <button
                  key={r.id}
                  onClick={() => !filed && openResidentForm(r)}
                  disabled={filed}
                  className={cn(
                    'w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 min-h-[56px] text-left transition-colors',
                    filed
                      ? 'opacity-60 cursor-not-allowed'
                      : 'cursor-pointer active:bg-zinc-800/50'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                    filed
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-indigo-500/15 text-indigo-400'
                  )}>
                    {r.first_name[0]}{r.last_name[0]}
                  </div>

                  {/* Name + room */}
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-semibold text-white truncate'>
                      {r.first_name} {r.last_name}
                    </p>
                    {r.room && (
                      <p className='text-xs text-zinc-500 mt-0.5'>Room {r.room}</p>
                    )}
                  </div>

                  {/* Status chip */}
                  {filed ? (
                    <span className='flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0'>
                      <CheckCircle2 size={11} />
                      Filed
                    </span>
                  ) : hasPending ? (
                    <span className='bg-amber-500/10 text-amber-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0'>
                      Pending
                    </span>
                  ) : (
                    <span className='bg-zinc-700/50 text-zinc-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0'>
                      Pending
                    </span>
                  )}

                  {!filed && <ChevronRight size={16} className='text-zinc-600 shrink-0' />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Entry form view ──────────────────────────────────────────────────────
  return (
    <div className='pb-8'>
      {/* Back header */}
      <div className='flex items-center gap-3 px-4 pt-4 pb-3 border-b border-zinc-800'>
        <button
          onClick={closeForm}
          className='w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 min-h-[44px] min-w-[44px]'
        >
          <ArrowLeft size={18} />
        </button>
        <div className='flex-1 min-w-0'>
          <p className='text-[15px] font-semibold text-white truncate'>
            {selectedResident.first_name} {selectedResident.last_name}
          </p>
          <p className='text-xs text-zinc-500'>IPOS Entry · Today</p>
        </div>
      </div>

      {/* Shift selector */}
      <div className='px-4 pt-3 pb-2'>
        <p className='text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2'>Shift</p>
        <div className='flex gap-2'>
          {SHIFTS.map(s => (
            <button
              key={s}
              onClick={() => setShift(s)}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold border min-h-[44px] uppercase tracking-widest transition-colors',
                shift === s
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <p className='text-[11px] text-zinc-500 mt-1.5'>{SHIFT_LABELS[shift]}</p>
      </div>

      {/* Goals skeleton */}
      {goalsLoading && (
        <div className='px-4 pt-2 space-y-2'>
          {[0, 1, 2].map(i => (
            <div key={i} className='h-28 bg-zinc-800/50 rounded-xl animate-pulse' />
          ))}
        </div>
      )}

      {/* No goals message */}
      {!goalsLoading && residentGoals.length === 0 && (
        <div className='mx-4 mt-3 bg-zinc-800/40 border border-zinc-700/40 rounded-xl px-4 py-5 text-center'>
          <p className='text-sm text-zinc-400'>No goal codes configured for this resident.</p>
          <p className='text-xs text-zinc-500 mt-1'>Contact your manager to add goals.</p>
        </div>
      )}

      {/* CLS goals */}
      {!goalsLoading && clsGoals.length > 0 && (
        <div className='px-4 pt-3'>
          <p className='text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2'>CLS Goals</p>
          {entries
            .filter(e => clsGoals.some(g => g.id === e.goal_id))
            .map((draft) => {
              const globalIdx = entries.findIndex(e => e.goal_id === draft.goal_id)
              return (
                <GoalRow
                  key={draft.goal_id}
                  draft={draft}
                  onChange={updated => updateEntry(globalIdx, updated)}
                  goalType='cls'
                />
              )
            })
          }
        </div>
      )}

      {/* PC goals */}
      {!goalsLoading && pcGoals.length > 0 && (
        <div className='px-4 pt-2'>
          <p className='text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2'>PC Goals</p>
          {entries
            .filter(e => pcGoals.some(g => g.id === e.goal_id))
            .map((draft) => {
              const globalIdx = entries.findIndex(e => e.goal_id === draft.goal_id)
              return (
                <GoalRow
                  key={draft.goal_id}
                  draft={draft}
                  onChange={updated => updateEntry(globalIdx, updated)}
                  goalType='pc'
                />
              )
            })
          }
        </div>
      )}

      {/* Error */}
      {formError && (
        <div className='mx-4 mt-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl'>
          {formError}
        </div>
      )}

      {/* Submit */}
      {!goalsLoading && residentGoals.length > 0 && (
        <div className='px-4 mt-4'>
          <button
            onClick={() => { void handleSubmit() }}
            disabled={!hasAnyContent || submitting}
            className='w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] disabled:opacity-40 transition-opacity'
          >
            {submitting ? 'Submitting…' : 'Submit Entry'}
          </button>
          {!hasAnyContent && (
            <p className='text-center text-xs text-zinc-500 mt-2'>Fill in at least one goal to submit</p>
          )}
        </div>
      )}

      {/* Other entries today */}
      {otherEntries.length > 0 && (
        <div className='mt-4'>
          <OtherEntries entries={otherEntries} />
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface EmployeePropsExport {
  homeId:       string
  residents:    Resident[]
  showFab:      boolean
  onFabHandled: () => void
}

export default function IposTab({ homeId, residents, showFab, onFabHandled }: EmployeePropsExport) {
  const { isManagerOrAbove } = useRole()

  if (isManagerOrAbove) {
    return <IposCompliancePanel homeId={homeId} />
  }

  return (
    <IposEmployeeView
      homeId={homeId}
      residents={residents}
      showFab={showFab}
      onFabHandled={onFabHandled}
    />
  )
}
