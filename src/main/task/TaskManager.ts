import { randomUUID } from 'node:crypto'
import { app, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type { TaskConfig, TrackedTask } from '../../shared/task-types'
import { BaseTask } from './BaseTask'
import { TerrainPackTask } from './TerrainPackTask'
import { TerrainUnpackTask } from './TerrainUnpackTask'
import { TilesetPackTask } from './TilesetPackTask'
import { TilesetUnpackTask } from './TilesetUnpackTask'
import { TerrainGenTask } from '../terrain-gen/TerrainGenTask'

export class TaskManager {
  private static instance: TaskManager
  private tasks = new Map<string, TrackedTask>()
  private win: BrowserWindow | null = null
  private workerScriptDir: string

  private constructor() {
    this.workerScriptDir = app.isPackaged ? process.resourcesPath! : __dirname
  }

  static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager()
    }
    return TaskManager.instance
  }

  setWindow(win: BrowserWindow): void {
    this.win = win
  }

  /** 获取所有任务列表（供未来统一任务管理页使用） */
  getTasks(): TrackedTask[] {
    return Array.from(this.tasks.values())
  }

  start(config: TaskConfig): string {
    const taskId = randomUUID()

    if (config.type === 'terrain-gen') {
      return this.startTerrainGen(taskId, config)
    }

    let task: BaseTask
    if (config.type === 'pack') {
      task = new TerrainPackTask(taskId, config, this.workerScriptDir)
    } else if (config.type === 'unpack') {
      task = new TerrainUnpackTask(taskId, config, this.workerScriptDir)
    } else if (config.type === 'tileset-pack') {
      task = new TilesetPackTask(taskId, config, this.workerScriptDir)
    } else {
      task = new TilesetUnpackTask(taskId, config, this.workerScriptDir)
    }

    this.bindEvents(taskId, task)

    this.tasks.set(taskId, task)
    task.status = 'running'

    task.run().catch((err) => {
      task.complete(false, err instanceof Error ? err.message : String(err))
    })

    return taskId
  }

  private startTerrainGen(taskId: string, config: TaskConfig): string {
    const tifDir = config.tifDir || ''
    const outputDir = config.outputDir || ''
    const minZoom = config.minZoom ?? 0
    const maxZoom = config.maxZoom ?? 14
    const jdkPath = config.jdkPath || ''
    const jarPath = config.jarPath || ''

    const task = new TerrainGenTask({
      id: taskId,
      tifDir,
      outputDir,
      minZoom,
      maxZoom,
      jdkPath,
      jarPath,
      advanced: config.advanced,
    })

    this.bindEvents(taskId, task as unknown as TrackedTask)
    this.tasks.set(taskId, task)

    task.run().catch((err) => {
      const error = err instanceof Error ? err.message : String(err)
      task.emit('complete', {
        taskId,
        type: 'terrain-gen',
        success: false,
        error,
      })
    })

    return taskId
  }

  private bindEvents(taskId: string, task: TrackedTask): void {
    task.on('log', (msg) => {
      this.win?.webContents.send(IPC.TASK_LOG, msg)
    })
    task.on('progress', (p) => {
      this.win?.webContents.send(IPC.TASK_PROGRESS, p)
    })
    task.on('complete', (result) => {
      this.win?.webContents.send(IPC.TASK_COMPLETE, result)
      this.tasks.delete(taskId)
    })
  }

  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'running') return false
    task.cancel()
    this.tasks.delete(taskId)
    return true
  }
}
