import { openDB, type IDBPDatabase } from 'idb'

interface QueuedSubmission {
  id:                string
  url:               string
  method:            string
  body:              unknown
  offline_queued_at: string
  type:              'shift-note' | 'medication-log'
}

interface CachedResponse {
  url:        string
  data:       unknown
  cached_at:  string
}

let db: IDBPDatabase | null = null

async function getDb(): Promise<IDBPDatabase> {
  if (db) return db
  db = await openDB('grouphome-offline', 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('pendingSubmissions')) {
        database.createObjectStore('pendingSubmissions', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('cachedResponses')) {
        database.createObjectStore('cachedResponses', { keyPath: 'url' })
      }
    },
  })
  return db
}

export async function queueSubmission(
  type: QueuedSubmission['type'],
  url: string,
  method: string,
  body: unknown
): Promise<string> {
  const database = await getDb()
  const id       = crypto.randomUUID()
  const item: QueuedSubmission = {
    id,
    url,
    method,
    body,
    offline_queued_at: new Date().toISOString(),
    type,
  }
  await database.put('pendingSubmissions', item)
  return id
}

export async function getPendingCount(): Promise<number> {
  const database = await getDb()
  return database.count('pendingSubmissions')
}

export async function flushQueue(
  onFlush: (item: QueuedSubmission) => Promise<void>,
  onProgress?: (flushed: number, total: number) => void
): Promise<void> {
  const database = await getDb()
  const all      = await database.getAll('pendingSubmissions') as QueuedSubmission[]

  // Sort by queued time — oldest first
  all.sort((a, b) => a.offline_queued_at.localeCompare(b.offline_queued_at))

  for (let i = 0; i < all.length; i++) {
    const item = all[i]!
    try {
      await onFlush(item)
      await database.delete('pendingSubmissions', item.id)
      onProgress?.(i + 1, all.length)
    } catch {
      // Stop flush on first failure — maintain order
      break
    }
  }
}

export async function cacheResponse(url: string, data: unknown): Promise<void> {
  const database = await getDb()
  const item: CachedResponse = { url, data, cached_at: new Date().toISOString() }
  await database.put('cachedResponses', item)
}

export async function getCachedResponse<T>(url: string): Promise<T | null> {
  const database = await getDb()
  const item     = await database.get('cachedResponses', url) as CachedResponse | undefined
  return item ? (item.data as T) : null
}
