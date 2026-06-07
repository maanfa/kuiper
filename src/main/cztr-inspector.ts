import { DatabaseSync } from 'node:sqlite'

export interface CztrOpenResult {
  valid: boolean
  error?: string
  tables: string[]
  tileCount: number
  fileType?: 'cztr' | 'czts'
}

export interface CztrQueryResult {
  columns: { title: string, key: string, width?: number }[]
  rows: Record<string, unknown>[]
}

export interface CztrSummary {
  fileSize: number
  tileCount: number
  minZoom: number | null
  maxZoom: number | null
  minX: number | null
  maxX: number | null
  minY: number | null
  maxY: number | null
  binaryCount?: number
  tilesetCount?: number
  sourceDirectory?: string
}

function columnType(type: string): 'integer' | 'text' | 'blob' | 'real' {
  const t = type.toUpperCase()
  if (t.includes('INT')) return 'integer'
  if (t.includes('CHAR') || t.includes('TEXT') || t.includes('CLOB')) return 'text'
  if (t.includes('BLOB')) return 'blob'
  if (t.includes('REAL') || t.includes('FLOA') || t.includes('DOUB')) return 'real'
  return 'text'
}

export function openCztr(filePath: string): CztrOpenResult {
  let db: DatabaseSync
  try {
    db = new DatabaseSync(filePath)
  } catch {
    return { valid: false, error: '无法打开文件，可能不是有效的 SQLite 数据库', tables: [], tileCount: 0 }
  }

  try {
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]
    const tables = rows.map((r) => r.name)

    if (tables.length === 0) {
      db.close()
      return { valid: false, error: '数据库中没有任何表', tables, tileCount: 0 }
    }

    const hasTiles = tables.includes('tiles')
    const hasMetadata = tables.includes('metadata')
    const hasTilesets = tables.includes('tilesets')

    // czts: 需要 tiles + tilesets + metadata 三张表
    if (hasTiles && hasTilesets && hasMetadata) {
      const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM tiles').get() as { cnt: number }
      const tileCount = countRow?.cnt ?? 0
      db.close()
      return { valid: true, tables, tileCount, fileType: 'czts' }
    }

    // cztr: 需要 tiles + metadata 两张表
    if (hasTiles && hasMetadata) {
      const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM tiles').get() as { cnt: number }
      const tileCount = countRow?.cnt ?? 0
      db.close()
      return { valid: true, tables, tileCount, fileType: 'cztr' }
    }

    // 缺少关键表
    const missing: string[] = []
    if (!hasTiles) missing.push('tiles')
    if (!hasMetadata) missing.push('metadata')
    db.close()
    return { valid: false, error: `缺少关键表: ${missing.join(', ')}`, tables, tileCount: 0 }
  } catch (err) {
    try { db.close() } catch { /* ignore */ }
    return { valid: false, error: `校验失败: ${(err as Error).message}`, tables: [], tileCount: 0 }
  }
}

export function queryCztr(filePath: string, tableName: string, search?: string): CztrQueryResult {
  const db = new DatabaseSync(filePath)

  try {
    const colRows = db.prepare(`PRAGMA table_info('${tableName}')`).all() as { name: string, type: string }[]

    if (colRows.length === 0) {
      db.close()
      return { columns: [], rows: [] }
    }

    const columns: { title: string, key: string, width?: number }[] = colRows.map((c) => {
      const col: { title: string, key: string, width?: number } = { title: c.name, key: c.name }
      if (tableName === 'metadata' && c.name === 'key') {
        col.width = 200
      }
      if (tableName === 'tiles' && c.name === 'z') {
        col.width = 22
      }
      if (tableName === 'tiles' && (c.name === 'x' || c.name === 'y')) {
        col.width = 24
      }
      if (tableName === 'tiles' && c.name === 'data') {
        col.width = 120
      }
      return col
    })

    let sql: string
    let params: unknown[] = []

    if (tableName === 'metadata') {
      sql = 'SELECT key, value FROM metadata'
    } else if (tableName === 'tiles') {
      // 检测 tiles 表结构：czts 用 uri 做主键，cztr 用 z/x/y
      const hasUri = colRows.some((c) => c.name === 'uri')
      if (hasUri) {
        sql = "SELECT uri, '[RAW BLOB]' AS data FROM tiles"
        if (search) {
          sql += ' WHERE uri LIKE ?'
          params = [`%${search}%`]
        }
        sql += ' LIMIT 100'
      } else {
        sql = "SELECT z, x, y, '[RAW BLOB]' AS data FROM tiles"
        if (search) {
          const pattern = `%${search}%`
          sql += ' WHERE (CAST(z AS TEXT) || \'/\' || CAST(x AS TEXT) || \'/\' || CAST(y AS TEXT)) LIKE ?'
          params = [pattern]
        }
        sql += ' LIMIT 100'
      }
    } else if (tableName === 'tilesets') {
      // czts tilesets 表：显示 uri 和截断的 JSON
      sql = "SELECT uri, CASE WHEN length(data) > 200 THEN substr(data, 1, 200) || '…' ELSE data END AS data FROM tilesets LIMIT 100"
    } else {
      schemaSafe(tableName)
      sql = `SELECT * FROM "${tableName}" LIMIT 100`
    }

    const stmt = db.prepare(sql)
    const rows = (params.length ? stmt.all(...params) : stmt.all()) as Record<string, unknown>[]

    for (const row of rows) {
      for (const col of colRows) {
        if (columnType(col.type) === 'blob' && row[col.name] instanceof Buffer) {
          row[col.name] = '[RAW BLOB]'
        }
      }
    }

    for (const row of rows) {
      for (const col of colRows) {
        const val = row[col.name]
        if (typeof val === 'string' && val.length > 80) {
          row[col.name] = val.slice(0, 80) + '…'
        }
      }
    }

    db.close()
    return { columns, rows }
  } catch (err) {
    try { db.close() } catch { /* ignore */ }
    throw err
  }
}

function schemaSafe(tableName: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error(`非法表名: ${tableName}`)
  }
}

export function queryCztrRow(filePath: string, tableName: string, whereCol: string, whereVal: unknown): Record<string, unknown> | null {
  schemaSafe(tableName)
  schemaSafe(whereCol)
  const db = new DatabaseSync(filePath)

  try {
    const sql = `SELECT * FROM "${tableName}" WHERE "${whereCol}" = ? LIMIT 1`
    const stmt = db.prepare(sql)
    const row = stmt.get(whereVal) as Record<string, unknown> | undefined
    db.close()
    return row ?? null
  } catch {
    try { db.close() } catch { /* ignore */ }
    return null
  }
}

export function queryCztrTile(filePath: string, z: number, x: number, y: number): { z: number, x: number, y: number, dataSize: number } | null {
  const db = new DatabaseSync(filePath)

  try {
    const sql = 'SELECT z, x, y, length(data) AS dataSize FROM tiles WHERE z = ? AND x = ? AND y = ?'
    const stmt = db.prepare(sql)
    const row = stmt.get(z, x, y) as { z: number, x: number, y: number, dataSize: number } | undefined
    db.close()
    return row ?? null
  } catch {
    try { db.close() } catch { /* ignore */ }
    return null
  }
}

export function saveCztrTile(filePath: string, z: number, x: number, y: number, destPath: string): boolean {
  const db = new DatabaseSync(filePath)

  try {
    const stmt = db.prepare('SELECT data FROM tiles WHERE z = ? AND x = ? AND y = ?')
    const row = stmt.get(z, x, y) as { data: Buffer } | undefined
    if (!row || !row.data) {
      db.close()
      return false
    }
    const fs = require('node:fs') as typeof import('node:fs')
    fs.writeFileSync(destPath, row.data)
    db.close()
    return true
  } catch {
    try { db.close() } catch { /* ignore */ }
    return false
  }
}

/** 根据 URI 保存 czts tiles 表中的二进制瓦片到指定路径 */
export function saveTileByUri(filePath: string, uri: string, destPath: string): boolean {
  const db = new DatabaseSync(filePath)

  try {
    const stmt = db.prepare('SELECT data FROM tiles WHERE uri = ?')
    const row = stmt.get(uri) as { data: Buffer } | undefined
    if (!row || !row.data) {
      db.close()
      return false
    }
    const fs = require('node:fs') as typeof import('node:fs')
    fs.writeFileSync(destPath, row.data)
    db.close()
    return true
  } catch {
    try { db.close() } catch { /* ignore */ }
    return false
  }
}

export function getCztrSummary(filePath: string): CztrSummary | null {
  const db = new DatabaseSync(filePath)
  try {
    const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM tiles').get() as { cnt: number }
    const tileCount = countRow?.cnt ?? 0

    let minZoom: number | null = null
    let maxZoom: number | null = null
    let minX: number | null = null
    let maxX: number | null = null
    let minY: number | null = null
    let maxY: number | null = null
    let binaryCount: number | undefined
    let tilesetCount: number | undefined
    let sourceDirectory: string | undefined

    // 检测 tiles 表结构
    const colRows = db.prepare("PRAGMA table_info('tiles')").all() as { name: string }[]
    const hasZ = colRows.some((c) => c.name === 'z')

    if (hasZ && tileCount > 0) {
      const zoomRow = db.prepare('SELECT MIN(z) AS minZ, MAX(z) AS maxZ FROM tiles').get() as { minZ: number, maxZ: number }
      minZoom = zoomRow?.minZ ?? null
      maxZoom = zoomRow?.maxZ ?? null

      const boundsRow = db.prepare('SELECT MIN(x) AS minX, MAX(x) AS maxX, MIN(y) AS minY, MAX(y) AS maxY FROM tiles').get() as { minX: number, maxX: number, minY: number, maxY: number }
      minX = boundsRow?.minX ?? null
      maxX = boundsRow?.maxX ?? null
      minY = boundsRow?.minY ?? null
      maxY = boundsRow?.maxY ?? null
    }

    // 尝试读取 metadata 表的 czts 扩展字段（cztr 也会尝试，静默忽略）
    try {
      const metaRows = db.prepare('SELECT key, value FROM metadata').all() as { key: string, value: string }[]
      for (const row of metaRows) {
        if (row.key === 'binary_count') binaryCount = Number(row.value)
        if (row.key === 'tileset_count') tilesetCount = Number(row.value)
        if (row.key === 'source_directory') sourceDirectory = row.value
      }
    } catch {
      // metadata 表可能不包含这些字段，忽略
    }

    const fs = require('node:fs') as typeof import('node:fs')
    const fileSize = fs.statSync(filePath).size
    db.close()
    return { fileSize, tileCount, minZoom, maxZoom, minX, maxX, minY, maxY, binaryCount, tilesetCount, sourceDirectory }
  } catch {
    try { db.close() } catch { /* ignore */ }
    return null
  }
}
