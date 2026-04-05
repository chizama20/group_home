interface Props {
  open:           boolean
  onStayLoggedIn: () => void
  onLogoutNow:    () => void
}

export default function SessionWarningModal({ open, onStayLoggedIn, onLogoutNow }: Props) {
  if (!open) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div className='absolute inset-0 bg-black/40' />

      <div className='relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-6 z-10'>
        <h2 className='text-lg font-semibold text-zinc-900 dark:text-white mb-2'>
          Still there?
        </h2>
        <p className='text-sm text-zinc-600 dark:text-zinc-400 mb-6'>
          You'll be logged out in 2 minutes due to inactivity.
        </p>

        <div className='flex gap-3'>
          <button
            onClick={onStayLoggedIn}
            className='flex-1 bg-indigo-600 text-white rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-indigo-700 transition-colors'
          >
            Stay logged in
          </button>
          <button
            onClick={onLogoutNow}
            className='flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg py-3 text-sm font-semibold min-h-[44px] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors'
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
