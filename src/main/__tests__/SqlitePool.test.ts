import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SqlitePool } from '../server/SqlitePool'

let tmpDir: string
let dbPath: string
const pools: SqlitePool[] = []

function createPool(maxSize: number): SqlitePool {
  const pool = new SqlitePool(maxSize)
  pools.push(pool)
  return pool
}

beforeEach(() => {
  pools.length = 0
  tmpDir = mkdtempSync(join(tmpdir(), 'kuiper-pool-'))
  dbPath = join(tmpDir, 'test.db')
  const db = new DatabaseSync(dbPath)
  db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)')
  db.close()
})

afterEach(() => {
  for (const pool of pools) {
    pool.closeAll()
  }
  pools.length = 0
  try { rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
})

describe('SqlitePool', () => {
  describe('constructor', () => {
    it('钳位 maxSize：0 为默认 10，负值钳位到 1，上限 100', () => {
      // Math.floor(0) || 10 → 10 (0 is falsy), max(1, min(100, 10)) = 10
      expect(createPool(0)['maxSize']).toBe(10)
      // Math.floor(-5) = -5 (truthy), max(1, min(100, -5)) = 1
      expect(createPool(-5)['maxSize']).toBe(1)
      expect(createPool(200)['maxSize']).toBe(100)
      expect(createPool(5)['maxSize']).toBe(5)
    })
  })

  describe('acquire', () => {
    it('创建并缓存数据库连接', () => {
      const pool = createPool(3)
      const db = pool.acquire(dbPath)
      expect(db).toBeInstanceOf(DatabaseSync)
      expect(pool.getStatus().total).toBe(1)
    })

    it('重复 acquire 返回同一实例', () => {
      const pool = createPool(3)
      const db1 = pool.acquire(dbPath)
      const db2 = pool.acquire(dbPath)
      expect(db1).toBe(db2)
      expect(pool.getStatus().total).toBe(1)
    })

    it('多路径创建多个连接', () => {
      const pool = createPool(3)
      const path2 = join(tmpDir, 'test2.db')
      const db2 = new DatabaseSync(path2)
      db2.exec('CREATE TABLE t (x INTEGER)')
      db2.close()

      pool.acquire(dbPath)
      pool.acquire(path2)
      expect(pool.getStatus().total).toBe(2)
    })
  })

  describe('LRU 淘汰', () => {
    it('超过 maxSize 时淘汰最旧的连接', () => {
      const pool = createPool(2)
      const p1 = join(tmpDir, '1.db')
      const p2 = join(tmpDir, '2.db')
      const p3 = join(tmpDir, '3.db')
      ;[p1, p2, p3].forEach((p) => {
        const d = new DatabaseSync(p)
        d.exec('CREATE TABLE t (x)')
        d.close()
      })

      pool.acquire(p1)
      pool.acquire(p2)
      // p1 最旧
      pool.acquire(p3)
      const status = pool.getStatus()
      expect(status.total).toBe(2)
      expect(status.entries.some((e) => e.path === p1)).toBe(false)
      expect(status.entries.some((e) => e.path === p2)).toBe(true)
      expect(status.entries.some((e) => e.path === p3)).toBe(true)
    })

    it('最近使用的不会被淘汰', async () => {
      const pool = createPool(2)
      const p1 = join(tmpDir, 'a.db')
      const p2 = join(tmpDir, 'b.db')
      const p3 = join(tmpDir, 'c.db')
      ;[p1, p2, p3].forEach((p) => {
        const d = new DatabaseSync(p)
        d.exec('CREATE TABLE t (x)')
        d.close()
      })

      pool.acquire(p1)
      // 人为延迟 1ms 保证时间戳不同
      await new Promise((r) => setTimeout(r, 1))
      pool.acquire(p2)
      await new Promise((r) => setTimeout(r, 1))
      // 刷新 p1 使 p2 成为最旧
      pool.acquire(p1)
      await new Promise((r) => setTimeout(r, 1))
      pool.acquire(p3)

      const status = pool.getStatus()
      expect(status.total).toBe(2)
      expect(status.entries.some((e) => e.path === p1)).toBe(true)
      expect(status.entries.some((e) => e.path === p2)).toBe(false)
    })
  })

  describe('closeAll', () => {
    it('关闭所有连接', () => {
      const pool = createPool(5)
      pool.acquire(dbPath)
      pool.closeAll()
      expect(pool.getStatus().total).toBe(0)
    })
  })

  describe('getStatus', () => {
    it('初始状态为空', () => {
      const pool = createPool(10)
      const status = pool.getStatus()
      expect(status.total).toBe(0)
      expect(status.max).toBe(10)
      expect(status.entries).toEqual([])
    })
  })

  describe('warn 回调', () => {
    it('60s 内淘汰 >=3 次触发警告', () => {
      vi.useFakeTimers()
      const pool = createPool(2)
      const warn = vi.fn()
      pool.setWarnCallback(warn)

      const paths: string[] = []
      for (let i = 0; i < 5; i++) {
        const p = join(tmpDir, `${i}.db`)
        const d = new DatabaseSync(p)
        d.exec('CREATE TABLE t (x)')
        d.close()
        paths.push(p)
        pool.acquire(p)
        // 每次淘汰后推进时间，确保触发累积计数
        vi.advanceTimersByTime(100)
      }

      // 最多保留 2 个，前 3 个被淘汰
      expect(warn).toHaveBeenCalled()
      const msg = warn.mock.calls[0][0]
      expect(msg).toContain('连接淘汰')
      expect(msg).toContain('增大最大连接数')
      vi.useRealTimers()
    })
  })
})
