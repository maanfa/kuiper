import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { TaskResult } from '../../shared/task-types'
import { formatDuration } from '../../shared/time-utils'
import { BaseTask } from './BaseTask'

interface TilesetRow {
  uri: string
  data: string
}

interface TileRow {
  uri: string
  data: Buffer
}

export class TilesetUnpackTask extends BaseTask {
  private db: DatabaseSync | null = null
  private outputDir = ''

  protected cleanup(): void {
    try { this.db?.close() } catch { /* ignore */ }
    this.db = null
    if (this.outputDir) {
      try { rmSync(this.outputDir, { recursive: true, force: true }) } catch { /* ignore */ }
      this.log('info', `已清理输出目录: ${this.outputDir}`)
    }
  }

  async run(): Promise<TaskResult> {
    const startTime = Date.now()
    try {
      const sourceFile = this.config.sourceFile!
      this.outputDir = this.config.outputDir!

      this.log('info', `[${this.id}] 开始解包 3DTiles: ${sourceFile} → ${this.outputDir}`)
      await this.yield()

      if (!existsSync(sourceFile)) {
        return this.fail('源文件不存在')
      }

      this.log('info', '正在打开数据库...')
      this.db = new DatabaseSync(sourceFile)
      this.log('info', '已打开数据库')

      if (this.config.clearOutput && existsSync(this.outputDir)) {
        this.log('info', `清理目标文件夹: ${this.outputDir}`)
        rmSync(this.outputDir, { recursive: true, force: true })
        await this.yield()
      }
      mkdirSync(this.outputDir, { recursive: true })

      // 查询并写入 tilesets（JSON 文件，含目录结构）
      this.log('info', '正在还原 tileset.json 文件...')
      const tilesetRows = this.db.prepare('SELECT uri, data FROM tilesets').all() as TilesetRow[]
      for (const row of tilesetRows) {
        const destPath = join(this.outputDir, row.uri)
        mkdirSync(join(destPath, '..'), { recursive: true })
        // 确保写入的是有效 JSON
        try {
          const parsed = JSON.parse(row.data)
          writeFileSync(destPath, JSON.stringify(parsed, null, 2), 'utf-8')
        } catch {
          writeFileSync(destPath, row.data, 'utf-8')
        }
      }
      this.log('info', `已还原 ${tilesetRows.length} 个 tileset.json`)

      // 查询并批量写入二进制瓦片
      this.log('info', '正在查询瓦片列表...')
      const tileRows = this.db.prepare('SELECT uri, data FROM tiles').all() as TileRow[]
      const total = tileRows.length

      if (total === 0) {
        this.db.close()
        this.db = null
        this.log('info', '没有二进制瓦片需要还原')
        const elapsed = formatDuration(Date.now() - startTime)
        this.log('info', `[${this.id}] 解包完成，耗时 ${elapsed}`)
        return this.succeed()
      }

      const BATCH_SIZE = this.config.batchSize ?? 400
      const totalBatches = Math.ceil(total / BATCH_SIZE)

      for (let i = 0; i < total && !this.isCancelled; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const batch = tileRows.slice(i, i + BATCH_SIZE)
        this.log('info', `[批次 ${batchNum}/${totalBatches}] 正在还原瓦片文件...`)

        const entries = batch.map((r) => ({
          path: join(this.outputDir, r.uri),
          data: r.data,
        }))

        // 写入文件并创建目录
        for (const entry of entries) {
          mkdirSync(join(entry.path, '..'), { recursive: true })
          writeFileSync(entry.path, entry.data)
        }

        if (this.isCancelled) break

        const current = Math.min(i + batch.length, total)
        this.updateProgress(current, total)
        this.log('info', `[批次 ${batchNum}/${totalBatches}] 已完成: ${current}/${total}`)
        await this.yield()
      }

      if (this.isCancelled) return this.cancelled()

      this.db.close()
      this.db = null

      const elapsed = formatDuration(Date.now() - startTime)
      this.log('info', `[${this.id}] 解包完成: ${total} 个瓦片 + ${tilesetRows.length} 个 tileset 已还原到 ${this.outputDir}，耗时 ${elapsed}`)
      this.updateProgress(total, total)
      return this.succeed()
    } catch (err) {
      return this.fail((err as Error).message)
    }
  }

  private cancelled(): TaskResult {
    this.complete(false, '任务已取消')
    return { taskId: this.id, type: 'tileset-unpack', success: false, error: '任务已取消' }
  }

  private fail(error: string): TaskResult {
    this.complete(false, error)
    return { taskId: this.id, type: 'tileset-unpack', success: false, error }
  }

  private succeed(): TaskResult {
    this.complete(true)
    return { taskId: this.id, type: 'tileset-unpack', success: true }
  }

  private yield(): Promise<void> {
    return new Promise((r) => setImmediate(r))
  }
}
