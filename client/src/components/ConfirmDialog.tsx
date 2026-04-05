import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  confirmVariant?: 'default' | 'destructive'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onCancel() }}>
      <DialogContent className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl'>
        <DialogHeader>
          <DialogTitle className='text-[17px] font-semibold text-zinc-900 dark:text-white'>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className='text-sm text-zinc-500 dark:text-zinc-400'>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className='flex gap-3 justify-end mt-6'>
          <button
            type='button'
            onClick={onCancel}
            className='bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px]'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={onConfirm}
            className={
              confirmVariant === 'destructive'
                ? 'bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px]'
                : 'bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px]'
            }
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
