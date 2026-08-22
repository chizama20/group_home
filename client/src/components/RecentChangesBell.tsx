import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import RecentChangesPanel from './RecentChangesPanel'
import { getRecentScheduleChanges } from '../api/schedule'

export default function RecentChangesBell() {
  const [open, setOpen] = useState(false)
  const [unseenCount, setUnseenCount] = useState(0)

  // Fetch the badge count on mount, independent of whether the sheet is open
  useEffect(() => {
    getRecentScheduleChanges()
      .then(res => {
        if (res.data.success && res.data.data) setUnseenCount(res.data.data.unseenCount)
      })
      .catch(() => {/* non-critical */})
  }, [])

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors'
        aria-label='Recent schedule changes'
      >
        <Bell className='w-[18px] h-[18px]' />
        {unseenCount > 0 && (
          <span className='absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center'>
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className='fixed inset-0 bg-black/50 z-40' onClick={() => setOpen(false)} />
          <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-zinc-50 dark:bg-zinc-950 rounded-t-2xl z-50 pb-6 max-h-[85vh] overflow-y-auto'>
            <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />
            <div className='flex items-center justify-between px-4 pt-4 pb-3'>
              <h2 className='text-base font-bold text-zinc-900 dark:text-white'>Recent Changes</h2>
              <button
                onClick={() => setOpen(false)}
                className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors'
              >
                <X className='w-5 h-5 text-zinc-500 dark:text-zinc-400' />
              </button>
            </div>
            <div className='px-4'>
              <RecentChangesPanel onUnseenChange={setUnseenCount} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
