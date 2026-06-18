import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { getReviewQueue, getIposLog, approveIposLog, addReviewComment } from '../../api/logs'
import type { IposLog, IposEntry, IposReviewComment, Shift } from '../../types/log'
import { cn } from '../../lib/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

type QueueItem = IposLog & {
  entry_count: number
  staff_names: string
  shifts_covered: string
  days_remaining: number
}

interface LogDetail {
  log: IposLog
  entries: IposEntry[]
  comments: IposReviewComment[]
}

interface Props {
  homeId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(isoStr: string) {
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

const STATUS_CLASSES: Record<string, string> = {
  submitted:      'bg-amber-500/10 text-amber-400',
  approved:       'bg-emerald-500/10 text-emerald-400',
  needs_revision: 'bg-red-500/10 text-red-400',
  draft:          'bg-zinc-500/10 text-zinc-400',
}

const STATUS_LABELS: Record<string, string> = {
  submitted:      'Submitted',
  approved:       'Approved',
  needs_revision: 'Needs Revision',
  draft:          'Draft',
}

const SHIFT_PILL: Record<Shift, string> = {
  am: 'bg-sky-500/10 text-sky-400',
  pm: 'bg-violet-500/10 text-violet-400',
  mn: 'bg-primary/10 text-primary',
}

function ShiftPill({ shift }: { shift: Shift }) {
  return (
    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase', SHIFT_PILL[shift])}>
      {shift.toUpperCase()}
    </span>
  )
}

function DaysBadge({ days }: { days: number }) {
  const cls =
    days <= 1 ? 'bg-red-500/10 text-red-400' :
    days <= 3 ? 'bg-amber-500/10 text-amber-400' :
                'bg-zinc-500/10 text-zinc-400'
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', cls)}>
      {days <= 0 ? 'Overdue' : `${days}d left`}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function QueueSkeleton() {
  return (
    <div className='px-4 pt-2 space-y-2'>
      {[0, 1, 2].map(i => (
        <div key={i} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 animate-pulse'>
          <div className='flex justify-between mb-2'>
            <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-32' />
            <div className='h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-20' />
          </div>
          <div className='h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-48 mb-2' />
          <div className='flex gap-2'>
            <div className='h-5 bg-zinc-100 dark:bg-zinc-800 rounded w-10' />
            <div className='h-5 bg-zinc-100 dark:bg-zinc-800 rounded w-10' />
            <div className='h-5 bg-zinc-100 dark:bg-zinc-800 rounded w-16' />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Queue list ────────────────────────────────────────────────────────────────

interface QueueListProps {
  queue: QueueItem[]
  loading: boolean
  onSelect: (item: QueueItem) => void
}

function QueueList({ queue, loading, onSelect }: QueueListProps) {
  return (
    <div className='pt-4'>
      {/* Section header */}
      <div className='flex items-center gap-2 px-4 mb-3'>
        <p className='text-sm font-semibold text-zinc-900 dark:text-white'>Pending Approval</p>
        {queue.length > 0 && (
          <span className='bg-amber-500/10 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full'>
            {queue.length}
          </span>
        )}
      </div>

      {loading && <QueueSkeleton />}

      {!loading && queue.length === 0 && (
        <div className='mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center gap-2'>
          <p className='text-sm font-medium text-zinc-500 dark:text-zinc-400'>No logs pending approval</p>
          <p className='text-xs text-zinc-400 dark:text-zinc-600'>All caught up</p>
        </div>
      )}

      {!loading && (
        <div className='px-4 space-y-2'>
          {queue.map(item => {
            const shifts = (item.shifts_covered || '').split(',').map(s => s.trim()).filter(Boolean) as Shift[]
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className='w-full text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-2 active:bg-zinc-50 dark:active:bg-zinc-800/50 transition-colors'
              >
                {/* Row 1: name + date */}
                <div className='flex items-center justify-between mb-1'>
                  <p className='text-sm font-bold text-zinc-900 dark:text-white'>
                    {item.resident_first} {item.resident_last}
                  </p>
                  <p className='text-xs text-zinc-500 dark:text-zinc-400'>{formatDate(item.log_date)}</p>
                </div>

                {/* Row 2: staff names */}
                <p className='text-xs text-zinc-400 mb-2 truncate max-w-[80%]'>
                  {item.staff_names || 'No staff recorded'}
                </p>

                {/* Row 3: shift pills + days badge */}
                <div className='flex items-center gap-1.5 flex-wrap'>
                  {shifts.map(s => (
                    <ShiftPill key={s} shift={s} />
                  ))}
                  <DaysBadge days={item.days_remaining} />
                  <span className='ml-auto text-[10px] text-zinc-400'>
                    {item.entry_count} {item.entry_count === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Log detail ────────────────────────────────────────────────────────────────

interface LogDetailProps {
  detail: LogDetail
  onBack: () => void
  onRefresh: () => void
}

function LogDetail({ detail, onBack, onRefresh }: LogDetailProps) {
  const { log, entries, comments } = detail
  const [approving, setApproving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [commentEntryId, setCommentEntryId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [localStatus, setLocalStatus] = useState(log.status)

  function openCommentModal(entryId: string | null) {
    setCommentEntryId(entryId)
    setCommentText('')
    setShowModal(true)
  }

  async function handleApprove() {
    setApproving(true)
    try {
      await approveIposLog(log.id)
      onBack()
      onRefresh()
    } catch {
      // noop
    } finally {
      setApproving(false)
    }
  }

  async function handleSendComment() {
    if (!commentText.trim()) return
    setSending(true)
    try {
      await addReviewComment(log.id, {
        content: commentText.trim(),
        ...(commentEntryId ? { entry_id: commentEntryId } : {}),
      })
      setLocalStatus('needs_revision')
      setShowModal(false)
      setCommentText('')
      onRefresh()
    } catch {
      // noop
    } finally {
      setSending(false)
    }
  }

  // Find context for entry-specific comments
  function getEntryContext(entryId: string | null) {
    if (!entryId) return null
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return null
    return { shift: entry.shift, goalCode: entry.goal_code }
  }

  return (
    <div className='pb-8'>
      {/* Header */}
      <div className='flex items-center gap-3 px-4 pt-4 pb-2'>
        <button
          onClick={onBack}
          className='w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px]'
          aria-label='Back'
        >
          <ArrowLeft size={16} className='text-zinc-600 dark:text-zinc-300' />
        </button>
        <div className='flex-1 min-w-0'>
          <p className='text-base font-bold text-zinc-900 dark:text-white truncate'>
            {log.resident_first} {log.resident_last}
          </p>
          <p className='text-xs text-zinc-500 dark:text-zinc-400'>{formatDate(log.log_date)}</p>
        </div>
        {/* Approve All button */}
        <button
          onClick={() => { void handleApprove() }}
          disabled={approving || localStatus === 'approved'}
          className={cn(
            'bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl min-h-[44px] transition-colors',
            (approving || localStatus === 'approved') ? 'opacity-50 cursor-not-allowed' : 'active:bg-primary'
          )}
        >
          {approving ? 'Approving…' : localStatus === 'approved' ? 'Approved' : 'Approve All'}
        </button>
      </div>

      {/* Status badge */}
      <div className='px-4 mb-4'>
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_CLASSES[localStatus] ?? STATUS_CLASSES.draft)}>
          {STATUS_LABELS[localStatus] ?? localStatus}
        </span>
      </div>

      {/* Entries */}
      <div className='px-4 space-y-3 mb-4'>
        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>Entries</p>
        {entries.length === 0 && (
          <p className='text-sm text-zinc-400 dark:text-zinc-600'>No entries recorded.</p>
        )}
        {entries.map(entry => (
          <div key={entry.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4'>
            {/* Entry header: staff + shift + time */}
            <div className='flex items-center gap-2 mb-2'>
              <p className='text-sm font-semibold text-zinc-900 dark:text-white flex-1 min-w-0 truncate'>
                {entry.staff_first} {entry.staff_last}
              </p>
              <ShiftPill shift={entry.shift} />
              <p className='text-[10px] text-zinc-400 shrink-0'>{formatDateTime(entry.created_at)}</p>
            </div>

            {/* Goal code + description */}
            {(entry.goal_code || entry.goal_description) && (
              <div className='flex items-start gap-2 mb-2'>
                {entry.goal_code && (
                  <span className='bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0'>
                    {entry.goal_code}
                  </span>
                )}
                {entry.goal_description && (
                  <p className='text-xs text-zinc-500 dark:text-zinc-400'>{entry.goal_description}</p>
                )}
              </div>
            )}

            {/* Progress code + narrative */}
            {(entry.progress_code || entry.narrative) && (
              <div className='mb-2'>
                {entry.progress_code && (
                  <span className={cn(
                    'inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mr-2 mb-1',
                    'bg-emerald-500/10 text-emerald-400'
                  )}>
                    {entry.progress_code}
                  </span>
                )}
                {entry.narrative && (
                  <p className='text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed'>{entry.narrative}</p>
                )}
              </div>
            )}

            {/* Minutes row */}
            {(entry.cls_minutes > 0 || entry.pc_minutes > 0) && (
              <p className='text-xs text-zinc-400 dark:text-zinc-500 mb-2'>
                {[
                  entry.cls_minutes > 0 ? `CLS: ${entry.cls_minutes} min` : null,
                  entry.pc_minutes > 0  ? `PC: ${entry.pc_minutes} min`   : null,
                ].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Leave comment */}
            <button
              onClick={() => openCommentModal(entry.id)}
              className='flex items-center gap-1.5 text-xs font-medium text-primary dark:text-primary min-h-[44px] pr-2'
            >
              <MessageSquare size={13} />
              Leave Comment
            </button>
          </div>
        ))}
      </div>

      {/* Comment on entire log */}
      <div className='px-4 mb-6'>
        <button
          onClick={() => openCommentModal(null)}
          className='w-full flex items-center justify-center gap-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg py-3 min-h-[44px] text-sm font-medium text-zinc-500 dark:text-zinc-400 active:bg-zinc-50 dark:active:bg-zinc-800/30 transition-colors'
        >
          <MessageSquare size={15} />
          Comment on entire log
        </button>
      </div>

      {/* Comments section */}
      {comments.length > 0 && (
        <div className='px-4 space-y-2'>
          <p className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>Comments</p>
          {comments.map(c => {
            const ctx = getEntryContext(c.entry_id)
            return (
              <div key={c.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3'>
                <div className='flex items-center justify-between mb-1'>
                  <p className='text-xs font-semibold text-zinc-900 dark:text-white'>
                    {c.commenter_first} {c.commenter_last}
                  </p>
                  <p className='text-[10px] text-zinc-400'>{formatDateTime(c.created_at)}</p>
                </div>
                {ctx && (
                  <div className='flex items-center gap-1.5 mb-1.5'>
                    <ShiftPill shift={ctx.shift} />
                    {ctx.goalCode && (
                      <span className='bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded'>
                        {ctx.goalCode}
                      </span>
                    )}
                    <span className='text-[10px] text-zinc-400'>entry comment</span>
                  </div>
                )}
                <p className='text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed'>{c.content}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Comment modal */}
      {showModal && (
        <>
          <div
            className='fixed inset-0 bg-black/60 z-50'
            onClick={() => setShowModal(false)}
          />
          <div className='fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl z-50 max-h-[60vh] overflow-y-auto'>
            <div className='w-9 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-4' />

            <div className='px-4 mb-3'>
              <p className='text-sm font-semibold text-zinc-900 dark:text-white'>
                {commentEntryId ? 'Comment on Entry' : 'Comment on Log'}
              </p>
              <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
                This will request a revision from the submitting staff.
              </p>
            </div>

            <div className='px-4 mb-4'>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder='Enter your comment…'
                rows={4}
                autoFocus
                className='w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder-zinc-400'
              />
            </div>

            <div className='px-4 pb-8 flex gap-3'>
              <button
                onClick={() => setShowModal(false)}
                className='flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold py-3 rounded-xl min-h-[44px]'
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleSendComment() }}
                disabled={!commentText.trim() || sending}
                className='flex-1 bg-primary text-white text-sm font-semibold py-3 rounded-xl min-h-[44px] disabled:opacity-50 active:bg-primary transition-colors'
              >
                {sending ? 'Sending…' : 'Send & Request Revision'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ReviewQueueTab({ homeId }: Props) {
  const [queue, setQueue]             = useState<QueueItem[]>([])
  const [loading, setLoading]         = useState(false)
  const [selectedLog, setSelectedLog] = useState<LogDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadQueue = useCallback(() => {
    setLoading(true)
    getReviewQueue(homeId)
      .then(res => setQueue(res.data.data ?? []))
      .catch(() => {/* non-critical */})
      .finally(() => setLoading(false))
  }, [homeId])

  useEffect(() => { loadQueue() }, [loadQueue])

  async function handleSelect(item: QueueItem) {
    setDetailLoading(true)
    try {
      const res = await getIposLog(item.id)
      setSelectedLog(res.data.data ?? null)
    } catch {
      // noop
    } finally {
      setDetailLoading(false)
    }
  }

  function handleBack() {
    setSelectedLog(null)
  }

  if (detailLoading) {
    return (
      <div className='px-4 pt-4 space-y-3'>
        {[0, 1, 2].map(i => (
          <div key={i} className='h-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-pulse' />
        ))}
      </div>
    )
  }

  if (selectedLog) {
    return (
      <LogDetail
        detail={selectedLog}
        onBack={handleBack}
        onRefresh={loadQueue}
      />
    )
  }

  return (
    <QueueList
      queue={queue}
      loading={loading}
      onSelect={item => { void handleSelect(item) }}
    />
  )
}
