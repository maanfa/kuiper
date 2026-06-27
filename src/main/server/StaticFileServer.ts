import { Hono } from 'hono'
import { serve, type ServerType } from '@hono/node-server'
import { serveStatic } from 'hono/serve-static'
import { readFile, stat, readdir } from 'node:fs/promises'
import { statSync } from 'node:fs'
import { join as pathJoin } from 'node:path'
import type { StaticFileServerConfig, ServerLogEntry } from '../../shared/server-types'

export class StaticFileServer {
  private server: ServerType | null = null
  private config: StaticFileServerConfig | null = null
  private logCallback: ((entry: ServerLogEntry) => void) | null = null

  getStatus(): 'running' | 'stopped' {
    return this.server ? 'running' : 'stopped'
  }

  async start(config: StaticFileServerConfig, logCb: (entry: ServerLogEntry) => void): Promise<void> {
    if (this.server) {
      throw new Error('Server is already running')
    }

    this.config = config
    this.logCallback = logCb

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
        duration: Date.now() - start,
      })
    })

    app.use(
      `${pfx}/*`,
      serveStatic({
        root: config.rootDir,
        getContent: async (path: string) => {
          try {
            const data = await readFile(path)
            return data.buffer as ArrayBuffer
          } catch {
            return null
          }
        },
        isDir: async (path: string) => {
          try {
            const s = await stat(path)
            return s.isDirectory()
          } catch {
            return false
          }
        },
        join: pathJoin,
      }),
    )

    // Directory listing fallback: runs only when serveStatic didn't find a file
    app.get(`${pfx}/*`, async (c) => {
      if (!config.showDirectoryListing) return

      const reqPath = decodeURIComponent(c.req.path)
      const relPath = reqPath.replace(new RegExp(`^${escapeRegex(pfx)}`), '') || '/'
      const fullPath = pathJoin(config.rootDir, relPath)

      try {
        const s = await stat(fullPath)
        if (!s.isDirectory()) return

        const entries = await readdir(fullPath, { withFileTypes: true })
        const items = entries
          .filter((e) => !e.name.startsWith('.'))
          .map((e) => {
            let size = 0
            if (!e.isDirectory()) {
              try {
                // Synchronous statSync is fine here, paths are known
                const st = statSync(pathJoin(fullPath, e.name))
                size = st.size
              } catch { /* skip */ }
            }
            return {
              name: e.isDirectory() ? `${e.name}/` : e.name,
              isDir: e.isDirectory(),
              size,
            }
          })
          .toSorted((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
            return a.name.localeCompare(b.name)
          })

        const html = dirListPage(pfx, relPath, items)
        c.res = c.html(html)
      } catch {
        // Not a directory or doesn't exist, leave 404 as-is
      }
    })

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
    this.config = null
    this.logCallback = null
  }

  private pushLog(entry: ServerLogEntry): void {
    this.logCallback?.(entry)
  }
}

function normalizePrefix(prefix: string): string {
  let p = prefix || '/'
  if (!p.startsWith('/')) p = '/' + p
  if (p.endsWith('/')) p = p.slice(0, -1)
  return p
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function dirListPage(prefix: string, currentPath: string, items: { name: string, isDir: boolean, size: number }[]): string {
  const displayPath = currentPath === '/'
    ? prefix || '/'
    : `${prefix}${currentPath}`

  const parentLink = currentPath !== '/' && currentPath !== ''
    ? `<p><a href="${prefix}${dirParent(currentPath)}">⬆ 返回上级目录</a></p>`
    : ''

  const rows = items.map((item) => {
    const href = `${displayPath}${displayPath.endsWith('/') ? '' : '/'}${item.name}`
    return `
          <tr>
            <td class="col-icon">${item.isDir ? '📁' : '📄'}</td>
            <td class="col-name"><a href="${escapeHtml(href)}">${escapeHtml(item.name)}</a></td>
            <td class="col-size">${item.isDir ? '-' : formatFileSize(item.size)}</td>
          </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>目录浏览 — ${escapeHtml(displayPath)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      color: #333;
      background: #fafafa;
      padding: 24px 32px;
      max-width: 960px;
      margin: 0 auto;
    }
    h1 {
      font-size: 18px;
      font-weight: 600;
      color: #222;
      margin-bottom: 8px;
      word-break: break-all;
    }
    h1 span { color: #888; font-weight: 400; font-size: 14px; }
    p { margin-bottom: 16px; }
    a { color: #1a73e8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 10px 16px;
      text-align: left;
      border-bottom: 1px solid #f0f0f0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .col-icon { width: 40px; text-align: center; }
    .col-name { word-break: break-all; }
    .col-size { width: 100px; text-align: right; color: #888; font-size: 13px; }
    td.col-name a { display: block; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f5f7fa; }
    footer {
      margin-top: 24px;
      font-size: 12px;
      color: #bbb;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>目录浏览 <span>${escapeHtml(displayPath)}</span></h1>
  ${parentLink}
  <table>
    <thead>
      <tr>
        <th class="col-icon"></th>
        <th>名称</th>
        <th class="col-size">大小</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <footer>KuiperBox 静态文件服务</footer>
</body>
</html>`
}

function dirParent(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/\/$/, '')
  const idx = normalized.lastIndexOf('/')
  return idx <= 0 ? '/' : normalized.slice(0, idx)
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return bytes + ' B'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
