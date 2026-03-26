// Thin shim — delegates to HomeContext so all existing callers continue to work
import { useHome } from '../context/HomeContext'

export function useSelectedHome() {
  return useHome()
}
