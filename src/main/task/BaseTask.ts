import EventEmitter from 'eventemitter3'
import { join } from 'node:path'
import type { TaskConfig, TaskResult, TaskStatus, TaskType } from '../../shared/task-types'
import { FileWorkerPool } from './FileWorkerPool'

export abstract class BaseTask extends EventEmitter {
  id: string
  status: TaskStatus
  progress: { current: number, total: number }
  protected config: TaskConfig
  protected type: TaskType
  protected pool: FileWorkerPool
  isCancelled = false

  constructor(id: string, config: TaskConfig, workerScriptDir: string) {
    super()
    this.id = id
    this.config = config
    this.type = config.type
    this.status = 'pending'
    this.progress = { current: 0, total: 0 }
    this.pool = new FileWorkerPool(config.workerCount ?? 3, join(workerScriptDir, 'task/tile-worker.js'))
  }

  abstract run(): Promise<TaskResult>

  protected abstract cleanup(): void

  cancel(): void {
    this.isCancelled = true
    this.status = 'cancelled'
    this.cleanup()
    this.pool.destroy()
    const result: TaskResult = { taskId: this.id, type: this.type, success: false, error: '任务已取消' }
    this.emit('complete', result)
  }

  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    this.emit('log', { taskId: this.id, level, message, timestamp: Date.now() })
  }

  protected updateProgress(current: number, total: number): void {
    this.progress = { current, total }
    this.emit('progress', { taskId: this.id, current, total })
  }

  protected complete(success: boolean, error?: string): void {
    if (this.isCancelled) return
    this.status = success ? 'completed' : 'failed'
    this.pool.destroy()
    const result: TaskResult = { taskId: this.id, type: this.type, success, error }
    this.emit('complete', result)
  }
}
