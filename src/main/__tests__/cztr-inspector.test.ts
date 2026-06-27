import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  openCztr,
  queryCztr,
  queryCztrRow,
  queryCztrTile,
  saveCztrTile,
  saveTileByUri,
  getCztrSummary,
} from '../cztr-inspector'

let tmpDir: string

function makeCztr(extra?: (db: DatabaseSync) => void): string {
  const path = join(tmpDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.cztr`)
  const db = new DatabaseSync(path)
  db.exec(`
    CREATE TABLE tiles (
      z INTEGER NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      data BLOB NOT NULL,
      PRIMARY KEY (z, x, y)
    ) WITHOUT ROWID
  `)
  db.exec(`CREATE TABLE metadata (key TEXT NOT NULL, value TEXT)`)
  db.exec(`CREATE TABLE meta (key TEXT NOT NULL, value TEXT)`)
  const stmt = db.prepare('INSERT INTO tiles (z, x, y, data) VALUES (?, ?, ?, ?)')
  stmt.run(0, 0, 0, Buffer.from('tile-0-0-0'))
  stmt.run(0, 1, 0, Buffer.from('tile-0-1-0'))
  stmt.run(1, 0, 0, Buffer.from('tile-1-0-0'))
  stmt.run(2, 0, 0, Buffer.from('tile-2-0-0'))
  db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('layer', 'dem')
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('hello', 'world')
  if (extra) extra(db)
  db.close()
  return path
}

function makeCzts(extra?: (db: DatabaseSync) => void): string {
  const path = join(tmpDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.czts`)
  const db = new DatabaseSync(path)
  db.exec(`
    CREATE TABLE tiles (
      uri TEXT NOT NULL PRIMARY KEY,
      data BLOB NOT NULL
    ) WITHOUT ROWID
  `)
  db.exec(`CREATE TABLE tilesets (uri TEXT NOT NULL, data TEXT NOT NULL)`)
  db.exec(`CREATE TABLE metadata (key TEXT NOT NULL, value TEXT)`)
  const stmt = db.prepare('INSERT INTO tiles (uri, data) VALUES (?, ?)')
  stmt.run('tile/0/0/0.terrain', Buffer.from('data-0'))
  stmt.run('tile/0/1/0.terrain', Buffer.from('data-1'))
  db.prepare('INSERT INTO tilesets (uri, data) VALUES (?, ?)').run('tileset.json', '{"root":{}}')
  db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('source_directory', '/test/source')
  if (extra) extra(db)
  db.close()
  return path
}

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kuiper-test-'))
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('openCztr', () => {
  it('打开无效文件返回 valid: false', () => {
    const result = openCztr(join(tmpDir, 'nonexistent.db'))
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('打开空数据库返回 valid: false', () => {
    const emptyPath = join(tmpDir, 'empty.db')
    const db = new DatabaseSync(emptyPath)
    db.close()
    const result = openCztr(emptyPath)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('没有任何表')
  })

  it('缺少关键表返回 valid: false', () => {
    const badPath = join(tmpDir, 'bad.db')
    const db = new DatabaseSync(badPath)
    db.exec('CREATE TABLE foo (x INTEGER)')
    db.close()
    const result = openCztr(badPath)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('缺少关键表')
  })

  it('识别 .cztr 格式 (tiles + metadata)', () => {
    const path = makeCztr()
    const result = openCztr(path)
    expect(result.valid).toBe(true)
    expect(result.fileType).toBe('cztr')
    expect(result.tileCount).toBe(4)
    expect(result.tables).toContain('metadata')
    expect(result.tables).toContain('tiles')
  })

  it('识别 .czts 格式 (tiles + tilesets + metadata)', () => {
    const path = makeCzts()
    const result = openCztr(path)
    expect(result.valid).toBe(true)
    expect(result.fileType).toBe('czts')
    expect(result.tileCount).toBe(2)
  })
})

describe('queryCztr', () => {
  it('查询 metadata 表', () => {
    const path = makeCztr()
    const result = queryCztr(path, 'metadata')
    expect(result.columns.length).toBeGreaterThan(0)
    expect(result.rows.length).toBeGreaterThan(0)
  })

  it('查询 tiles 表 (z/x/y 格式)', () => {
    const path = makeCztr()
    const result = queryCztr(path, 'tiles')
    expect(result.rows.length).toBe(4)
    expect(result.rows[0]).toHaveProperty('z')
    expect(result.rows[0]).toHaveProperty('x')
    expect(result.rows[0]).toHaveProperty('y')
  })

  it('查询 tiles 表带搜索', () => {
    const path = makeCztr()
    const result = queryCztr(path, 'tiles', '0/0')
    expect(result.rows.length).toBeGreaterThan(0)
  })

  it('查询 czts tiles 表 (uri 格式)', () => {
    const path = makeCzts()
    const result = queryCztr(path, 'tiles')
    expect(result.rows.length).toBe(2)
    expect(result.rows[0]).toHaveProperty('uri')
  })

  it('查询 tilesets 表', () => {
    const path = makeCzts()
    const result = queryCztr(path, 'tilesets')
    expect(result.rows.length).toBe(1)
  })

  it('查询不存在的表返回空', () => {
    const path = makeCztr()
    const result = queryCztr(path, 'nonexistent')
    expect(result.columns).toEqual([])
    expect(result.rows).toEqual([])
  })
})

describe('queryCztrRow', () => {
  it('按 key 查询 metadata 行', () => {
    const path = makeCztr()
    const row = queryCztrRow(path, 'meta', 'key', 'hello')
    expect(row).not.toBeNull()
    expect(row!.value).toBe('world')
  })

  it('查询不存在的行返回 null', () => {
    const path = makeCztr()
    const row = queryCztrRow(path, 'meta', 'key', 'nonexistent')
    expect(row).toBeNull()
  })

  it('非法列名抛出', () => {
    const path = makeCztr()
    expect(() => queryCztrRow(path, 'meta', 'bad;DROP', 'x')).toThrow()
  })
})

describe('queryCztrTile', () => {
  it('按 z/x/y 查询瓦片', () => {
    const path = makeCztr()
    const tile = queryCztrTile(path, 0, 0, 0)
    expect(tile).not.toBeNull()
    expect(tile!.z).toBe(0)
    expect(tile!.x).toBe(0)
    expect(tile!.y).toBe(0)
    expect(tile!.dataSize).toBeGreaterThan(0)
  })

  it('不存在的瓦片返回 null', () => {
    const path = makeCztr()
    expect(queryCztrTile(path, 99, 99, 99)).toBeNull()
  })
})

describe('saveCztrTile', () => {
  it('导出瓦片到文件', () => {
    const path = makeCztr()
    const dest = join(tmpDir, 'exported.terrain')
    const result = saveCztrTile(path, 0, 1, 0, dest)
    expect(result).toBe(true)
    const buf = require('node:fs').readFileSync(dest)
    expect(buf.toString()).toBe('tile-0-1-0')
  })

  it('不存在的瓦片返回 false', () => {
    const path = makeCztr()
    const dest = join(tmpDir, 'not-found.terrain')
    expect(saveCztrTile(path, 99, 99, 99, dest)).toBe(false)
  })
})

describe('saveTileByUri', () => {
  it('按 URI 导出 czts 瓦片', () => {
    const path = makeCzts()
    const dest = join(tmpDir, 'czts-tile.terrain')
    const result = saveTileByUri(path, 'tile/0/0/0.terrain', dest)
    expect(result).toBe(true)
    const buf = require('node:fs').readFileSync(dest)
    expect(buf.toString()).toBe('data-0')
  })

  it('不存在的 URI 返回 false', () => {
    const path = makeCzts()
    const dest = join(tmpDir, 'notfound.terrain')
    expect(saveTileByUri(path, 'nonexistent', dest)).toBe(false)
  })
})

describe('getCztrSummary', () => {
  it('统计瓦片数量和坐标范围', () => {
    const path = makeCztr()
    const summary = getCztrSummary(path)
    expect(summary).not.toBeNull()
    expect(summary!.tileCount).toBe(4)
    expect(summary!.fileSize).toBeGreaterThan(0)
    expect(summary!.minZoom).toBe(0)
    expect(summary!.maxZoom).toBe(2)
  })

  it('czts 摘要包含 source_directory', () => {
    const path = makeCzts()
    const summary = getCztrSummary(path)
    expect(summary).not.toBeNull()
    expect(summary!.tileCount).toBe(2)
    expect(summary!.sourceDirectory).toBe('/test/source')
  })

  it('无效文件返回 null', () => {
    expect(getCztrSummary(join(tmpDir, 'notexist.db'))).toBeNull()
  })
})
