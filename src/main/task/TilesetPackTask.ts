import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { copyFile } from 'node:fs/promises'
import { join, dirname, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import type { TaskResult } from '../../shared/task-types'
import { formatDuration } from '../../shared/time-utils'
import { BaseTask } from './BaseTask'

interface TilesetJson {
  asset: Record<string, unknown>
  geometricError: number
  root: TileNode
  extensionsUsed?: string[]
  extensionsRequired?: string[]
}

interface TileNode {
  boundingVolume: Record<string, unknown>
  geometricError: number
  refine?: string
  content?: TileContent
  children?: TileNode[]
  transform?: number[]
}

interface TileContent {
  uri?: string
  url?: string
}

interface TileEntry {
  uri: string
  /** 'binary' | 'tileset' */
  kind: 'binary' | 'tileset'
  filePath: string
}

const BINARY_EXTENSIONS = ['.b3dm', '.i3dm', '.pnts', '.cmpt']

export class TilesetPackTask extends BaseTask {
  private db: DatabaseSync | null = null
  private outputFile = ''
  private localDbPath = ''

  protected cleanup(): void {
    try { this.db?.close() } catch { /* ignore */ }
    this.db = null
    if (this.localDbPath) {
      try { rmSync(this.localDbPath, { force: true }) } catch { /* ignore */ }
    }
    if (this.outputFile) {
      try { rmSync(this.outputFile, { force: true }) } catch { /* ignore */ }
      this.log('info', `已删除输出文件: ${this.outputFile}`)
    }
  }

  async run(): Promise<TaskResult> {
    const startTime = Date.now()
    try {
      const tilesetJsonPath = this.config.tilesetJsonPath!
      this.outputFile = this.config.tilesetOutputFile!

      this.log('info', `[${this.id}] 开始打包 3DTiles: ${tilesetJsonPath} → ${this.outputFile}`)
      await this.yield()

      if (!existsSync(tilesetJsonPath)) {
        return this.fail('tileset.json 文件不存在')
      }

      const rootDir = dirname(resolve(tilesetJsonPath))

      this.log('info', '正在解析 tileset.json...')
      let rootTileset: TilesetJson
      try {
        const raw = readFileSync(tilesetJsonPath, 'utf-8')
        rootTileset = JSON.parse(raw)
      } catch {
        return this.fail('tileset.json 解析失败')
      }
      this.log('info', '已解析 tileset.json')
      await this.yield()

      // 收集所有 tile 条目
      const tileEntries: TileEntry[] = []
      const tilesetEntries: TileEntry[] = []

      // 根 tileset 自身记入 tilesets 表
      tilesetEntries.push({
        uri: relative(rootDir, tilesetJsonPath).replace(/\\/g, '/') || 'tileset.json',
        kind: 'tileset',
        filePath: tilesetJsonPath,
      })

      this.log('info', '正在遍历 tile 树...')
      try {
        this.walkTileTree(rootTileset.root, rootDir, tileEntries, tilesetEntries)
      } catch (err) {
        return this.fail(`遍历 tile 树失败: ${(err as Error).message}`)
      }

      const binaryCount = tileEntries.length
      const tilesetCount = tilesetEntries.length
      const totalEntries = binaryCount + tilesetCount

      if (totalEntries === 0) {
        return this.fail('未找到任何有效的 tile 内容')
      }

      this.log('info', `遍历完成: ${binaryCount} 个二进制瓦片, ${tilesetCount} 个外部 tileset`)
      this.updateProgress(0, totalEntries)
      await this.yield()

      // 创建数据库
      mkdirSync(dirname(this.outputFile), { recursive: true })
      this.localDbPath = join(tmpdir(), `${this.id}.db`)
      this.log('info', '正在创建数据库...')
      this.db = new DatabaseSync(this.localDbPath)

      this.db.exec(`
        CREATE TABLE tiles (
          uri TEXT PRIMARY KEY NOT NULL,
          data BLOB NOT NULL
        ) WITHOUT ROWID
      `)
      this.db.exec(`
        CREATE TABLE tilesets (
          uri TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL
        ) WITHOUT ROWID
      `)
      this.db.exec(`
        CREATE TABLE metadata (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        )
      `)
      this.log('info', '已创建数据库')
      await this.yield()

      // 写入二进制瓦片
      if (binaryCount > 0) {
        this.log('info', `正在写入 ${binaryCount} 个二进制瓦片...`)
        const insertTile = this.db.prepare('INSERT OR REPLACE INTO tiles (uri, data) VALUES (?, ?)')
        this.db.exec('BEGIN')
        for (let i = 0; i < tileEntries.length && !this.isCancelled; i++) {
          const entry = tileEntries[i]
          const data = readFileSync(entry.filePath)
          insertTile.run(entry.uri, data)
          if (i % 100 === 0) {
            this.updateProgress(i, totalEntries)
            await this.yield()
          }
        }
        this.db.exec('COMMIT')
        this.log('info', `二进制瓦片写入完成`)
      }

      if (this.isCancelled) return this.cancelled()

      // 写入 tileset JSON
      if (tilesetCount > 0) {
        this.log('info', `正在写入 ${tilesetCount} 个 tileset.json...`)
        const insertTileset = this.db.prepare('INSERT OR REPLACE INTO tilesets (uri, data) VALUES (?, ?)')
        this.db.exec('BEGIN')
        for (let i = 0; i < tilesetEntries.length && !this.isCancelled; i++) {
          const entry = tilesetEntries[i]
          const jsonStr = readFileSync(entry.filePath, 'utf-8')
          insertTileset.run(entry.uri, jsonStr)
          this.updateProgress(binaryCount + i, totalEntries)
          if (i % 50 === 0) await this.yield()
        }
        this.db.exec('COMMIT')
        this.log('info', `tileset.json 写入完成`)
      }

      if (this.isCancelled) return this.cancelled()

      // 写入元数据
      this.log('info', '正在写入元数据...')
      const rootTilesetRaw = readFileSync(tilesetJsonPath, 'utf-8')
      const metaStmt = this.db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)')
      this.db.exec('BEGIN')
      metaStmt.run('root_tileset_json', rootTilesetRaw)
      metaStmt.run('root_uri', relative(rootDir, tilesetJsonPath).replace(/\\/g, '/') || 'tileset.json')
      metaStmt.run('binary_count', String(binaryCount))
      metaStmt.run('tileset_count', String(tilesetCount))
      metaStmt.run('source_directory', rootDir)
      metaStmt.run('asset_version', String(rootTileset.asset.version || ''))
      metaStmt.run('created_at', new Date().toISOString())
      this.db.exec('COMMIT')
      this.log('info', `元数据: ${binaryCount} 二进制瓦片, ${tilesetCount} tileset`)

      this.db.close()
      this.db = null

      this.log('info', '正在复制数据库到目标位置...')
      await this.yield()
      await copyFile(this.localDbPath, this.outputFile)
      try { rmSync(this.localDbPath, { force: true }) } catch { /* ignore */ }
      this.localDbPath = ''

      const elapsed = formatDuration(Date.now() - startTime)
      this.log('info', `[${this.id}] 打包完成: ${totalEntries} 个条目已写入 ${this.outputFile}，耗时 ${elapsed}`)
      this.updateProgress(totalEntries, totalEntries)
      return this.succeed()
    } catch (err) {
      return this.fail((err as Error).message)
    }
  }

  /**
   * 递归遍历 tile 树，收集所有条目
   * - 无 content 或 content 为空对象 → 跳过
   * - content.uri 指向 .json → 作为外部 tileset 处理，递归
   * - content.uri 指向 .b3dm/.i3dm/.pnts/.cmpt → 作为二进制瓦片
   */
  private walkTileTree(
    node: TileNode,
    currentDir: string,
    binaryEntries: TileEntry[],
    tilesetEntries: TileEntry[],
  ): void {
    // 处理当前节点的 content（如果有）
    const content = node.content
    if (content) {
      const rawUri = content.uri || content.url
      if (rawUri) {
        const uri = rawUri.replace(/\\/g, '/')
        if (uri.startsWith('data:')) {
          this.log('warn', `跳过 data URI: ${uri.slice(0, 60)}...`)
        } else {
          const filePath = resolve(currentDir, uri)
          if (!existsSync(filePath)) {
            this.log('warn', `文件不存在，跳过: ${filePath}`)
          } else {
            const relUri = relative(dirname(this.config.tilesetJsonPath!), filePath).replace(/\\/g, '/')
            const lower = uri.toLowerCase()

            if (lower.endsWith('.json')) {
              // 外部 tileset
              if (tilesetEntries.some((e) => e.uri === relUri)) {
                this.log('warn', `跳过重复 tileset: ${relUri}`)
              } else {
                tilesetEntries.push({ uri: relUri, kind: 'tileset', filePath })

                // 递归解析外部 tileset
                try {
                  const jsonRaw = readFileSync(filePath, 'utf-8')
                  const externalTileset = JSON.parse(jsonRaw) as TilesetJson
                  if (externalTileset.root) {
                    this.walkTileTree(
                      externalTileset.root,
                      dirname(filePath),
                      binaryEntries,
                      tilesetEntries,
                    )
                  }
                } catch (err) {
                  this.log('warn', `解析外部 tileset 失败: ${filePath}, ${(err as Error).message}`)
                }
              }
            } else if (BINARY_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
              if (binaryEntries.some((e) => e.uri === relUri)) {
                this.log('warn', `跳过重复瓦片: ${relUri}`)
              } else {
                binaryEntries.push({ uri: relUri, kind: 'binary', filePath })
              }
            } else {
              this.log('warn', `未知格式，跳过: ${uri}`)
            }
          }
        }
      }
    }

    // 遍历子节点（关键：无论当前节点是否有 content，都要递归处理 children）
    if (node.children) {
      for (const child of node.children) {
        this.walkTileTree(child, currentDir, binaryEntries, tilesetEntries)
      }
    }
  }

  private cancelled(): TaskResult {
    this.complete(false, '任务已取消')
    return { taskId: this.id, type: 'tileset-pack', success: false, error: '任务已取消' }
  }

  private fail(error: string): TaskResult {
    this.complete(false, error)
    return { taskId: this.id, type: 'tileset-pack', success: false, error }
  }

  private succeed(): TaskResult {
    this.complete(true)
    return { taskId: this.id, type: 'tileset-pack', success: true }
  }

  private yield(): Promise<void> {
    return new Promise((r) => setImmediate(r))
  }
}
