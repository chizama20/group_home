import { useState } from 'react'
import { MapPin, Check, ChevronsUpDown } from 'lucide-react'
import { useHome } from '../context/HomeContext'

export default function HomeSwitcherStrip() {
  const { homes, homeId, selectedHome, selectHome } = useHome()
  const [open, setOpen] = useState(false)

  if (homes.length <= 1) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className='w-full flex items-center justify-between bg-primary dark:bg-primary/10 border-b border-primary dark:border-primary/20 px-4 py-2.5 text-left'
      >
        <div className='flex items-center gap-2 min-w-0'>
          <MapPin className='h-3.5 w-3.5 text-primary shrink-0' />
          <span className='text-sm font-medium text-primary dark:text-primary truncate'>
            {selectedHome?.name ?? 'Select a home'}
          </span>
        </div>
        <ChevronsUpDown className='h-3.5 w-3.5 text-primary dark:text-primary shrink-0 ml-2' />
      </button>

      {open && (
        <>
          <div className='fixed inset-0 bg-black/40 z-40' onClick={() => setOpen(false)} />
          <div className='fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-sm md:rounded-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl z-50'>
            <div className='w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 md:hidden' />
            <div className='px-4 pt-3 pb-6'>
              <h2 className='text-base font-semibold text-zinc-900 dark:text-white mb-3'>Switch home</h2>
              <ul className='space-y-1'>
                {homes.map(h => (
                  <li key={h.id}>
                    <button
                      onClick={() => { selectHome(h.id); setOpen(false) }}
                      className='w-full flex items-center justify-between px-3 py-3 rounded-xl text-left min-h-[52px] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors'
                    >
                      <div className='min-w-0'>
                        <p className='text-sm font-medium text-zinc-900 dark:text-white truncate'>{h.name}</p>
                        {h.address && (
                          <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate'>{h.address}</p>
                        )}
                      </div>
                      {h.id === homeId && (
                        <Check className='h-4 w-4 text-emerald-500 ml-2 shrink-0' />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </>
  )
}
