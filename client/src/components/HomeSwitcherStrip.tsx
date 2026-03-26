import { useState } from 'react'
import { useHome } from '../context/HomeContext'

export default function HomeSwitcherStrip() {
  const { homes, homeId, selectedHome, selectHome } = useHome()
  const [open, setOpen] = useState(false)

  // Hide when only one home — strip serves no purpose
  if (homes.length <= 1) return null

  return (
    <>
      {/* Strip bar */}
      <button
        onClick={() => setOpen(true)}
        className='w-full flex items-center justify-between bg-indigo-50 border-b border-indigo-100 px-4 py-2.5 text-left'
      >
        <div className='flex items-center gap-2 min-w-0'>
          <span className='text-xs text-indigo-400'>📍</span>
          <span className='text-sm font-medium text-indigo-800 truncate'>
            {selectedHome?.name ?? 'Select a home'}
          </span>
        </div>
        <span className='text-xs text-indigo-500 font-medium shrink-0 ml-2'>Switch home ›</span>
      </button>

      {/* Bottom sheet */}
      {open && (
        <>
          <div
            className='fixed inset-0 bg-black/40 z-40'
            onClick={() => setOpen(false)}
          />
          <div className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 pb-safe'>
            <div className='w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3' />
            <div className='px-4 pt-3 pb-6'>
              <h2 className='text-base font-semibold text-gray-900 mb-3'>Switch home</h2>
              <ul className='space-y-1'>
                {homes.map(h => (
                  <li key={h.id}>
                    <button
                      onClick={() => { selectHome(h.id); setOpen(false) }}
                      className='w-full flex items-center justify-between px-3 py-3 rounded-xl text-left min-h-[52px] hover:bg-gray-50 transition-colors'
                    >
                      <div className='min-w-0'>
                        <p className='text-sm font-medium text-gray-900 truncate'>{h.name}</p>
                        {h.address && (
                          <p className='text-xs text-gray-500 mt-0.5 truncate'>{h.address}</p>
                        )}
                      </div>
                      {h.id === homeId && (
                        <span className='text-green-600 text-lg ml-2 shrink-0'>✓</span>
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
