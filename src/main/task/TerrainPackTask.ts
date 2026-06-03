import { readFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'node:fs'
import { copyFile } from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import type { TaskResult } from '../../shared/task-types'
import { formatDuration } from '../../shared/time-utils'
import { BaseTask } from './BaseTask'

interface TileEntry {
  path: string
  z: number
  x: number
  y: number
}

export class TerrainPackTask extends BaseTask {
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
      const sourceDir = this.config.sourceDir!
      this.outputFile = this.config.outputFile!

      this.log('info', `[${this.id}] 开始打包: ${sourceDir} → ${this.outputFile}`)
      this.log('info', `并行数: ${this.config.workerCount ?? 3}`)
      await this.yield()

      this.log('info', '正在读取 layer.json...')
      const layerJsonPath = join(sourceDir, 'layer.json')
      if (!existsSync(layerJsonPath)) {
        return this.fail('源目录中未找到 layer.json')
      }
      const layerJsonRaw = readFileSync(layerJsonPath, 'utf-8')
      let layerJson: Record<string, unknown>
      try {
        layerJson = JSON.parse(layerJsonRaw)
      } catch {
        return this.fail('layer.json 解析失败')
      }
      this.log('info', '已读取 layer.json')
      this.log('info', `正在扫描源目录: ${sourceDir}`)
      await this.yield()

      const tileFiles = this.scanTerrainFiles(sourceDir)
      if (tileFiles.length === 0) {
        return this.fail('源目录中未找到 .terrain 文件')
      }

      const BATCH_SIZE = this.config.batchSize ?? 400
      const totalBatches = Math.ceil(tileFiles.length / BATCH_SIZE)
      this.log('info', `扫描完成: ${tileFiles.length} 个瓦片，每批 ${BATCH_SIZE} 个，共 ${totalBatches} 批`)
      this.updateProgress(0, tileFiles.length)

      mkdirSync(dirname(this.outputFile), { recursive: true })
      this.localDbPath = join(tmpdir(), `${this.id}.db`)
      this.log('info', '正在创建数据库...')
      this.db = new DatabaseSync(this.localDbPath)

      this.db.exec(`
        CREATE TABLE tiles (
          z INTEGER NOT NULL,
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          data BLOB NOT NULL,
          PRIMARY KEY (z, x, y)
        ) WITHOUT ROWID
      `)
      this.db.exec(`
        CREATE TABLE metadata (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        )
      `)
      this.log('info', '已创建数据库')

      const workerCount = this.config.workerCount ?? 3

      for (let i = 0; i < tileFiles.length && !this.isCancelled; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const batch = tileFiles.slice(i, i + BATCH_SIZE)
        this.log('info', `[批次 ${batchNum}/${totalBatches}] 正在读取瓦片文件...`)
        try {
          const batches = this.splitEvenly(batch, workerCount)
          const tempDbs: string[] = []
          const tasks = batches.map((sub, wi) => {
            const dbPath = join(tmpdir(), `${this.id}_${batchNum}_${wi}.db`)
            tempDbs.push(dbPath)
            return this.execWorker(wi, {
              type: 'readInsert',
              id: Date.now() + wi,
              files: sub.map((f) => ({ path: f.path, z: f.z, x: f.x, y: f.y })),
              dbPath,
            })
          })
          await Promise.all(tasks)

          this.log('info', `[批次 ${batchNum}/${totalBatches}] 正在合并数据库...`)
          for (const dbPath of tempDbs) {
            this.db!.exec(`ATTACH DATABASE '${dbPath}' AS tmp`)
            this.db!.exec('INSERT OR REPLACE INTO tiles SELECT * FROM tmp.tiles')
            this.db!.exec('DETACH DATABASE tmp')
            try { rmSync(dbPath, { force: true }) } catch { /* ignore */ }
            await this.yield()
          }
        } catch (err) {
          return this.fail(`读取瓦片失败: ${(err as Error).message}`)
        }

        const current = Math.min(i + batch.length, tileFiles.length)
        this.updateProgress(current, tileFiles.length)
        this.log('info', `[批次 ${batchNum}/${totalBatches}] 已完成: ${current}/${tileFiles.length}`)
        await this.yield()
      }

      if (this.isCancelled) return this.cancelled()

      this.log('info', '正在写入元数据...')
      this.writeMetadata(this.db, layerJsonRaw, layerJson, tileFiles)

      this.db.close()
      this.db = null

      this.log('info', '正在复制数据库到目标位置...')
      await this.yield()
      await copyFile(this.localDbPath, this.outputFile)
      try { rmSync(this.localDbPath, { force: true }) } catch { /* ignore */ }
      this.localDbPath = ''
      const elapsed = formatDuration(Date.now() - startTime)
      this.log('info', `[${this.id}] 打包完成: ${tileFiles.length} 个瓦片已写入 ${this.outputFile}，耗时 ${elapsed}`)
      this.updateProgress(tileFiles.length, tileFiles.length)
      return this.succeed()
    } catch (err) {
      return this.fail((err as Error).message)
    }
  }

  private scanTerrainFiles(root: string): TileEntry[] {
    const results: TileEntry[] = []
    this.walkDir(root, root, results)
    return results
  }

  private walkDir(root: string, current: string, results: TileEntry[]): void {
    let entries: ReturnType<typeof readdirSync>
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = join(current, entry.name)
      if (entry.isDirectory()) {
        this.walkDir(root, fullPath, results)
      } else if (entry.name.endsWith('.terrain')) {
        const rel = relative(root, fullPath).replace(/\\/g, '/')
        const parts = rel.split('/')
        if (parts.length === 3) {
          const fileName = parts[2].split('?')[0]
          const z = parseInt(parts[0], 10)
          const x = parseInt(parts[1], 10)
          const y = parseInt(fileName.replace('.terrain', ''), 10)
          if (!isNaN(z) && !isNaN(x) && !isNaN(y)) {
            results.push({ path: fullPath, z, x, y })
          }
        }
      }
    }
  }

  private writeMetadata(
    db: DatabaseSync,
    layerJsonRaw: string,
    layerJson: Record<string, unknown>,
    tileFiles: TileEntry[],
  ): void {
    const zooms = new Set(tileFiles.map((f) => f.z))
    const minzoom = Math.min(...zooms)
    const maxzoom = Math.max(...zooms)
    const bounds = (layerJson.bounds as number[])?.join(',') ?? ''
    const format = (layerJson.format as string) || 'quantized-mesh-1.0'
    const layerName = this.config.layerName || ''
    const now = new Date().toISOString()

    const metaStmt = db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)')
    db.exec('BEGIN')
    metaStmt.run('layer_json', layerJsonRaw)
    metaStmt.run('bounds', String(bounds))
    metaStmt.run('minzoom', String(minzoom))
    metaStmt.run('maxzoom', String(maxzoom))
    metaStmt.run('tile_count', String(tileFiles.length))
    metaStmt.run('format', String(format))
    metaStmt.run('created_at', now)
    metaStmt.run('source_directory', this.config.sourceDir!)
    metaStmt.run('layer_name', layerName || '')
    db.exec('COMMIT')

    this.log('info', `元数据: zoom ${minzoom}-${maxzoom}, ${tileFiles.length} 瓦片`)
  }

  private splitEvenly<T>(arr: T[], n: number): T[][] {
    const size = Math.ceil(arr.length / n)
    const batches: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      batches.push(arr.slice(i, i + size))
    }
    return batches
  }

  private execWorker(wi: number, cmd: Parameters<typeof this.pool.sendCommand>[1]): Promise<unknown> {
    return this.pool.sendCommand(wi, cmd)
  }

  private cancelled(): TaskResult {
    this.complete(false, '任务已取消')
    return { taskId: this.id, type: 'pack', success: false, error: '任务已取消' }
  }

  private fail(error: string): TaskResult {
    this.complete(false, error)
    return { taskId: this.id, type: 'pack', success: false, error }
  }

  private succeed(): TaskResult {
    this.complete(true)
    return { taskId: this.id, type: 'pack', success: true }
  }

  private yield(): Promise<void> {
    return new Promise((r) => setImmediate(r))
  }
}
