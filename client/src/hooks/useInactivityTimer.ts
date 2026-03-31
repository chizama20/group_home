import { useEffect, useRef, useCallback } from 'react'

const WARNING_MS  = 13 * 60 * 1000 // 13 minutes — show warning
const LOGOUT_MS   = 15 * 60 * 1000 // 15 minutes — force logout

interface Options {
  onWarning: () => void
  onLogout:  () => void
  enabled:   boolean
}

export function useInactivityTimer({ onWarning, onLogout, enabled }: Options) {
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current)
    if (logoutTimer.current)  clearTimeout(logoutTimer.current)
  }, [])

  const resetTimers = useCallback(() => {
    if (!enabled) return

    // Don't reset if the page is not visible
    if (document.visibilityState === 'hidden') return

    clearTimers()
    warningTimer.current = setTimeout(onWarning, WARNING_MS)
    logoutTimer.current  = setTimeout(onLogout,  LOGOUT_MS)
  }, [enabled, onWarning, onLogout, clearTimers])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      return
    }

    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const

    EVENTS.forEach(event => window.addEventListener(event, resetTimers, { passive: true }))

    // Pause timers when tab hidden, restart when visible
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        resetTimers()
      } else {
        clearTimers()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Start on mount
    resetTimers()

    return () => {
      EVENTS.forEach(event => window.removeEventListener(event, resetTimers))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimers()
    }
  }, [enabled, resetTimers, clearTimers])
}
