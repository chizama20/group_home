type Status = 'urgent' | 'attention' | 'all_good' | 'open' | 'signed_off' | 'escalated' | 'closed' | string

const statusConfig: Record<string, { label: string; classes: string }> = {
  urgent:     { label: 'Urgent',     classes: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  attention:  { label: 'Attention',  classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  all_good:   { label: 'All good',   classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  open:       { label: 'Open',       classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  signed_off: { label: 'Signed off', classes: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  escalated:  { label: 'Escalated',  classes: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  closed:     { label: 'Closed',     classes: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] ?? { label: status, classes: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  )
}
