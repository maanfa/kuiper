import { Hono, type Context } from 'hono'
import { serve, type ServerType } from '@hono/node-server'
import type {
  ServerConfig,
  ServerFileEntry,
  ServerLogEntry,
  ServerListResponse,
  ServerErrorResponse,
  ServerFileMetadata,
} from '../../shared/server-types'
import { getCztrSummary } from '../cztr-inspector'
import {
  fileListPage,
  fileDetailPage,
  errorPage,
  buildMetadataRows,
  cesiumCodeHtml,
} from './html-templates'
import { SqlitePool } from './SqlitePool'
import type { PoolStatus } from './SqlitePool'

export class StaticServer {
  private server: ServerType | null = null
  private config: ServerConfig | null = null
  private logCallback: ((entry: ServerLogEntry) => void) | null = null
  private pool: SqlitePool | null = null

  getStatus(): 'running' | 'stopped' {
    return this.server ? 'running' : 'stopped'
  }

  async start(config: ServerConfig, logCb: (entry: ServerLogEntry) => void): Promise<void> {
    if (this.server) {
      throw new Error('Server is already running')
    }

    this.config = config
    this.logCallback = logCb

    this.pool = new SqlitePool(config.maxConnections ?? 10)
    this.pool.setWarnCallback((msg) => {
      this.pushLog({
        timestamp: Date.now(),
        method: '',
        path: msg,
        status: 0,
        duration: 0,
      })
    })

    const app = new Hono()
    const pfx = normalizePrefix(config.prefix)

    app.use(`${pfx}/*`, async (c, next) => {
      const start = Date.now()
      await next()
      this.pushLog({
        timestamp: start,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        fileId: c.req.param('id') || undefined,
        duration: Date.now() - start,
      })
    })

    app.get(pfx, (c) => this.listFiles(c))
    app.get(`${pfx}/:id`, (c) => this.fileMetadata(c))
    app.get(`${pfx}/:id/tileset.json`, (c) => this.tilesetJson(c))
    app.get(`${pfx}/:id/tiles/:z/:x/:y`, (c) => this.terrainTile(c))
    app.get(`${pfx}/:id/*`, (c) => this.contentByUri(c))

    const rawServer = serve({
      fetch: app.fetch,
      port: config.port,
    })

    this.server = rawServer

    if (rawServer.listening) return

    await new Promise<void>((resolve, reject) => {
      rawServer.once('error', reject)
      rawServer.once('listening', resolve)
    })
  }

  stop(): void {
    if (this.server) {
      this.server.close()
      this.server = null
    }
    this.pool?.closeAll()
    this.pool = null
    this.config = null
    this.logCallback = null
  }

  private pushLog(entry: ServerLogEntry): void {
    this.logCallback?.(entry)
  }

  updateFiles(files: ServerFileEntry[]): void {
    if (this.config) {
      this.config.files = files
    }
  }

  getPoolStatus(): PoolStatus | null {
    return this.pool?.getStatus() ?? null
  }

  private getEnabledFile(id: string): ServerFileEntry | undefined {
    return this.config?.files.find((f) => f.id === id && f.enabled)
  }

  private prefix(): string {
    return normalizePrefix(this.config?.prefix ?? '/files')
  }

  private listFiles(c: Context): Response {
    const enabledFiles = this.config?.files.filter((f) => f.enabled) ?? []
    const items = enabledFiles.map((f) => ({
      id: f.id,
      name: fileName(f.path),
    }))

    if (c.req.query('fmt') === 'json') {
      const body: ServerListResponse = {
        count: items.length,
        items: items.map((item, i) => ({ ...item, path: enabledFiles[i].path })),
      }
      return c.json(body)
    }

    return c.html(fileListPage(this.prefix(), items))
  }

  private fileMetadata(c: Context): Response {
    const id = c.req.param('id')!
    const file = this.getEnabledFile(id)
    const pfx = this.prefix()

    if (!file) {
      return c.req.query('fmt') === 'json'
        ? c.json({ error: 'File not found' } as ServerErrorResponse, 404)
        : c.html(errorPage('', '未找到', '资源不存在或未启用', 404), 404)
    }

    try {
      const summary = getCztrSummary(file.path)
      if (!summary) {
        return c.req.query('fmt') === 'json'
          ? c.json({ error: 'Failed to read file metadata' } as ServerErrorResponse, 500)
          : c.html(errorPage(pfx, '错误', '无法读取文件元数据', 500), 500)
      }

      const metadata: ServerFileMetadata = {
        id: file.id,
        name: fileName(file.path),
        ...summary,
      }

      if (c.req.query('fmt') === 'json') {
        return c.json(metadata)
      }

      const rows = buildMetadataRows(metadata)
      const codeHtml = cesiumCodeHtml(this.config?.port ?? 9356, pfx, file.id, file.path)
      return c.html(fileDetailPage(pfx, metadata.name, rows, codeHtml))
    } catch (err) {
      return c.req.query('fmt') === 'json'
        ? c.json({ error: (err as Error).message } as ServerErrorResponse, 500)
        : c.html(errorPage(pfx, '错误', (err as Error).message, 500), 500)
    }
  }

  private tilesetJson(c: Context): Response {
    const id = c.req.param('id')!
    const file = this.getEnabledFile(id)
    if (!file) {
      const body: ServerErrorResponse = { error: 'File not found' }
      return c.json(body, 404)
    }

    try {
      const db = this.pool!.acquire(file.path)
      const rows = db.prepare('SELECT data FROM tilesets LIMIT 1').all() as { data: string }[]
      if (rows.length === 0) {
        const body: ServerErrorResponse = { error: 'No tileset found' }
        return c.json(body, 404)
      }

      const tileset = JSON.parse(rows[0].data)
      return c.json(tileset)
    } catch {
      const body: ServerErrorResponse = { error: 'Failed to read tileset' }
      return c.json(body, 500)
    }
  }

  private terrainTile(c: Context): Response {
    const id = c.req.param('id')!
    const z = parseInt(c.req.param('z')!, 10)
    const x = parseInt(c.req.param('x')!, 10)
    const y = parseInt(c.req.param('y')!, 10)

    const file = this.getEnabledFile(id)
    if (!file) {
      const body: ServerErrorResponse = { error: 'File not found' }
      return c.json(body, 404)
    }

    if (isNaN(z) || isNaN(x) || isNaN(y)) {
      const body: ServerErrorResponse = { error: 'Invalid tile coordinates' }
      return c.json(body, 400)
    }

    try {
      const db = this.pool!.acquire(file.path)
      const row = db.prepare('SELECT data FROM tiles WHERE z = ? AND x = ? AND y = ?').get(z, x, y) as { data: Buffer } | undefined
      if (!row || !row.data) {
        const body: ServerErrorResponse = { error: 'Tile not found' }
        return c.json(body, 404)
      }

      return c.body(new Uint8Array(row.data), 200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(row.data.length),
      })
    } catch {
      const body: ServerErrorResponse = { error: 'Failed to read tile' }
      return c.json(body, 500)
    }
  }

  private contentByUri(c: Context): Response {
    const id = c.req.param('id')!
    const uri = c.req.param('*')!

    const file = this.getEnabledFile(id)
    if (!file) {
      const body: ServerErrorResponse = { error: 'File not found' }
      return c.json(body, 404)
    }

    if (!uri) {
      const body: ServerErrorResponse = { error: 'Empty URI' }
      return c.json(body, 400)
    }

    try {
      const db = this.pool!.acquire(file.path)
      const row = db.prepare('SELECT data FROM tiles WHERE uri = ?').get(uri) as { data: Buffer } | undefined
      if (!row || !row.data) {
        const body: ServerErrorResponse = { error: 'Content not found' }
        return c.json(body, 404)
      }

      return c.body(new Uint8Array(row.data), 200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(row.data.length),
      })
    } catch {
      const body: ServerErrorResponse = { error: 'Failed to read content' }
      return c.json(body, 500)
    }
  }
}

function normalizePrefix(prefix: string): string {
  let p = prefix || '/files'
  if (!p.startsWith('/')) p = '/' + p
  if (p.endsWith('/')) p = p.slice(0, -1)
  return p
}

function fileName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1]
}
