import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AuditTab from './AuditTab'

export default function AuditLogPage() {
  const navigate = useNavigate()

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-8'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex items-center gap-3 px-4 pt-5 pb-2'>
          <button
            type='button'
            onClick={() => navigate('/settings')}
            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors'
            aria-label='Back to Settings'
          >
            <ArrowLeft className='h-5 w-5 text-zinc-700 dark:text-zinc-300' />
          </button>
          <div>
            <h1 className='text-xl font-bold text-zinc-900 dark:text-white'>Audit Log</h1>
            <p className='text-sm text-zinc-500 dark:text-zinc-400'>Cross-home activity history</p>
          </div>
        </div>

        <AuditTab selectedHomeId='all' homes={[]} />
      </div>
    </div>
  )
}
