import { DatabaseSync } from 'node:sqlite'

export interface CztrOpenResult {
  valid: boolean
  error?: string
  tables: string[]
  tileCount: number
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

    if (!hasTiles || !hasMetadata) {
      const missing: string[] = []
      if (!hasTiles) missing.push('tiles')
      if (!hasMetadata) missing.push('metadata')
      db.close()
      return { valid: false, error: `缺少关键表: ${missing.join(', ')}`, tables, tileCount: 0 }
    }

    const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM tiles').get() as { cnt: number }
    const tileCount = countRow?.cnt ?? 0
    db.close()

    return { valid: true, tables, tileCount }
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
      sql = "SELECT z, x, y, '[RAW BLOB]' AS data FROM tiles"
      if (search) {
        const pattern = `%${search}%`
        sql += ' WHERE (CAST(z AS TEXT) || \'/\' || CAST(x AS TEXT) || \'/\' || CAST(y AS TEXT)) LIKE ?'
        params = [pattern]
      }
      sql += ' LIMIT 100'
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

    if (tileCount > 0) {
      const zoomRow = db.prepare('SELECT MIN(z) AS minZ, MAX(z) AS maxZ FROM tiles').get() as { minZ: number, maxZ: number }
      minZoom = zoomRow?.minZ ?? null
      maxZoom = zoomRow?.maxZ ?? null

      const boundsRow = db.prepare('SELECT MIN(x) AS minX, MAX(x) AS maxX, MIN(y) AS minY, MAX(y) AS maxY FROM tiles').get() as { minX: number, maxX: number, minY: number, maxY: number }
      minX = boundsRow?.minX ?? null
      maxX = boundsRow?.maxX ?? null
      minY = boundsRow?.minY ?? null
      maxY = boundsRow?.maxY ?? null
    }

    const fs = require('node:fs') as typeof import('node:fs')
    const fileSize = fs.statSync(filePath).size
    db.close()
    return { fileSize, tileCount, minZoom, maxZoom, minX, maxX, minY, maxY }
  } catch {
    try { db.close() } catch { /* ignore */ }
    return null
  }
}
