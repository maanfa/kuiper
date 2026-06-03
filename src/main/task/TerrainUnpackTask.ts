import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { TaskResult } from '../../shared/task-types'
import { formatDuration } from '../../shared/time-utils'
import { BaseTask } from './BaseTask'

interface TileRow {
  z: number
  x: number
  y: number
  data: Buffer
}

export class TerrainUnpackTask extends BaseTask {
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

      this.log('info', `[${this.id}] 开始解包: ${sourceFile} → ${this.outputDir}`)
      this.log('info', `并行数: ${this.config.workerCount ?? 3}`)
      await this.yield()

      if (!existsSync(sourceFile)) {
        return this.fail('源文件不存在')
      }

      this.log('info', '正在打开数据库...')
      this.db = new DatabaseSync(sourceFile)
      this.log('info', '已打开数据库')

      this.log('info', '正在读取元数据...')
      const metaRows = this.db.prepare('SELECT key, value FROM metadata').all() as { key: string, value: string }[]
      const meta = Object.fromEntries(metaRows.map((r) => [r.key, r.value]))
      this.log('info', `已读取元数据: ${metaRows.length} 条`)

      if (this.config.clearOutput && existsSync(this.outputDir)) {
        this.log('info', `清理目标文件夹: ${this.outputDir}`)
        rmSync(this.outputDir, { recursive: true, force: true })
        await this.yield()
      }
      mkdirSync(this.outputDir, { recursive: true })
      if (meta.layer_json) {
        this.log('info', '正在还原 layer.json...')
        writeFileSync(join(this.outputDir, 'layer.json'), meta.layer_json, 'utf-8')
        this.log('info', '已还原 layer.json')
      }

      this.log('info', '正在查询瓦片列表...')
      const rows = this.db.prepare('SELECT z, x, y, data FROM tiles').all() as TileRow[]
      const total = rows.length

      const BATCH_SIZE = this.config.batchSize ?? 400
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE)

      for (let i = 0; i < rows.length && !this.isCancelled; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const batch = rows.slice(i, i + BATCH_SIZE)
        this.log('info', `[批次 ${batchNum}/${totalBatches}] 正在还原瓦片文件...`)
        const entries = batch.map((r) => ({
          path: join(this.outputDir, String(r.z), String(r.x), `${r.y}.terrain`),
          data: r.data,
        }))
        await this.pool.writeFiles(entries)

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
      this.log('info', `[${this.id}] 解包完成: ${total} 个瓦片已还原到 ${this.outputDir}，耗时 ${elapsed}`)
      this.updateProgress(total, total)
      return this.succeed()
    } catch (err) {
      return this.fail((err as Error).message)
    }
  }

  private cancelled(): TaskResult {
    this.complete(false, '任务已取消')
    return { taskId: this.id, type: 'unpack', success: false, error: '任务已取消' }
  }

  private fail(error: string): TaskResult {
    this.complete(false, error)
    return { taskId: this.id, type: 'unpack', success: false, error }
  }

  private succeed(): TaskResult {
    this.complete(true)
    return { taskId: this.id, type: 'unpack', success: true }
  }

  private yield(): Promise<void> {
    return new Promise((r) => setImmediate(r))
  }
}
