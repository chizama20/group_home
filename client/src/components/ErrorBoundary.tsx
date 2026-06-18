import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black px-4'>
          <p className='text-xl font-bold text-zinc-900 dark:text-white mb-2'>Group Home</p>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6'>
            Something went wrong. Please reload the page.
          </p>
          <button
            type='button'
            onClick={() => window.location.reload()}
            className='bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px]'
          >
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
