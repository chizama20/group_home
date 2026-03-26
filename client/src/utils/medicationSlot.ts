export function isSlotLocked(scheduledTime: string | null): boolean {
  if (!scheduledTime) return false
  const now = new Date()
  const [h, m] = scheduledTime.slice(0, 5).split(':').map(Number)
  const slotMins = (h ?? 0) * 60 + (m ?? 0)
  const nowMins  = now.getHours() * 60 + now.getMinutes()
  return nowMins < slotMins
}

export function slotLabel(scheduledTime: string | null): string {
  if (!scheduledTime) return 'Unscheduled'
  return scheduledTime.slice(0, 5)
}
