type Status = 'urgent' | 'attention' | 'all_good' | 'open' | 'signed_off' | 'escalated' | 'closed' | string

const statusConfig: Record<string, { label: string; classes: string }> = {
  urgent:     { label: 'Urgent',     classes: 'bg-red-100 text-red-800' },
  attention:  { label: 'Attention',  classes: 'bg-yellow-100 text-yellow-800' },
  all_good:   { label: 'All good',   classes: 'bg-green-100 text-green-800' },
  open:       { label: 'Open',       classes: 'bg-orange-100 text-orange-800' },
  signed_off: { label: 'Signed off', classes: 'bg-blue-100 text-blue-800' },
  escalated:  { label: 'Escalated',  classes: 'bg-purple-100 text-purple-800' },
  closed:     { label: 'Closed',     classes: 'bg-gray-100 text-gray-600' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  )
}
