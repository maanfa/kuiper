import { DatabaseSync } from 'node:sqlite'

interface PoolEntry {
  db: DatabaseSync
  lastAccess: number
}

export interface PoolStatus {
  total: number
  max: number
  entries: { path: string, lastAccess: number }[]
}

export type WarnCallback = (message: string) => void

export class SqlitePool {
  private pool = new Map<string, PoolEntry>()
  private maxSize: number
  private evictionTimestamps: number[] = []
  private warn: WarnCallback | null = null

  constructor(maxSize: number) {
    this.maxSize = Math.max(1, Math.min(100, Math.floor(maxSize) || 10))
  }

  setWarnCallback(cb: WarnCallback): void {
    this.warn = cb
  }

  acquire(filePath: string): DatabaseSync {
    const entry = this.pool.get(filePath)
    if (entry) {
      entry.lastAccess = Date.now()
      return entry.db
    }

    if (this.pool.size >= this.maxSize) {
      this.evictLRU()
    }

    const db = new DatabaseSync(filePath)
    this.pool.set(filePath, { db, lastAccess: Date.now() })
    return db
  }

  closeAll(): void {
    for (const entry of this.pool.values()) {
      try { entry.db.close() } catch { /* ignore */ }
    }
    this.pool.clear()
  }

  getStatus(): PoolStatus {
    const entries: { path: string, lastAccess: number }[] = []
    for (const [path, entry] of this.pool) {
      entries.push({ path, lastAccess: entry.lastAccess })
    }
    return { total: this.pool.size, max: this.maxSize, entries }
  }

  private evictLRU(): void {
    let oldestPath: string | null = null
    let oldestTime = Infinity

    for (const [path, entry] of this.pool) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess
        oldestPath = path
      }
    }

    if (oldestPath) {
      const entry = this.pool.get(oldestPath)
      try { entry?.db.close() } catch { /* ignore */ }
      this.pool.delete(oldestPath)
      this.trackEviction()
    }
  }

  private trackEviction(): void {
    const now = Date.now()
    this.evictionTimestamps.push(now)
    this.evictionTimestamps = this.evictionTimestamps.filter((t) => now - t < 60000)
    if (this.evictionTimestamps.length >= 3) {
      this.warn?.(
        `连接池在 60s 内已发生 ${this.evictionTimestamps.length} 次连接淘汰，建议增大最大连接数（当前 ${this.maxSize}）以减少 SQLite 开关开销`,
      )
    }
  }
}
