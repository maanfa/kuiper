import { randomUUID } from 'node:crypto'
import { app, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type { TaskConfig } from '../../shared/task-types'
import { BaseTask } from './BaseTask'
import { TerrainPackTask } from './TerrainPackTask'
import { TerrainUnpackTask } from './TerrainUnpackTask'
import { TilesetPackTask } from './TilesetPackTask'
import { TilesetUnpackTask } from './TilesetUnpackTask'

export class TaskManager {
  private static instance: TaskManager
  private tasks = new Map<string, BaseTask>()
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

  start(config: TaskConfig): string {
    const taskId = randomUUID()

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

    this.tasks.set(taskId, task)
    task.status = 'running'

    task.run().catch((err) => {
      task.complete(false, err instanceof Error ? err.message : String(err))
    })

    return taskId
  }

  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'running') return false
    task.cancel()
    this.tasks.delete(taskId)
    return true
  }
}
