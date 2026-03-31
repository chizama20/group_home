import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div className='fixed top-0 inset-x-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium'>
      <WifiOff className='h-4 w-4 shrink-0' />
      <span>You're offline — changes will sync when you reconnect</span>
    </div>
  )
}
