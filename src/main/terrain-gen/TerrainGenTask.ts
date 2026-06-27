import EventEmitter from 'eventemitter3'
import { spawn, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { TaskStatus, TaskType, TaskResult, TerrainGenAdvancedParams } from '../../shared/task-types'
import { getGlobalLogger } from '../logger'

export class TerrainGenTask extends EventEmitter {
  id: string
  status: TaskStatus = 'pending'
  type: TaskType = 'terrain-gen'
  progress = { current: 0, total: 0 }
  isCancelled = false

  private child: ChildProcess | null = null
  private readonly tifDir: string
  private readonly outputDir: string
  private readonly minZoom: number
  private readonly maxZoom: number
  private readonly jdkPath: string
  private readonly jarPath: string
  private readonly advanced: TerrainGenAdvancedParams | undefined

  constructor(args: {
    id: string
    tifDir: string
    outputDir: string
    minZoom: number
    maxZoom: number
    jdkPath: string
    jarPath: string
    advanced?: TerrainGenAdvancedParams
  }) {
    super()
    this.id = args.id
    this.tifDir = args.tifDir
    this.outputDir = args.outputDir
    this.minZoom = args.minZoom
    this.maxZoom = args.maxZoom
    this.jdkPath = args.jdkPath
    this.jarPath = args.jarPath
    this.advanced = args.advanced
  }

  cancel(): void {
    this.isCancelled = true
    this.status = 'cancelled'
    if (this.child && !this.child.killed) {
      this.child.kill('SIGTERM')
    }
    this.child = null
    const result: TaskResult = {
      taskId: this.id,
      type: this.type,
      success: false,
      error: '任务已取消',
    }
    this.emit('complete', result)
  }

  async run(): Promise<TaskResult> {
    this.status = 'running'

    const args = [
      '-jar', this.jarPath,
      '-i', this.tifDir,
      '-o', this.outputDir,
      '-min', String(this.minZoom),
      '-max', String(this.maxZoom),
    ]

    // 构建高级参数
    const adv = this.advanced
    if (adv) {
      if (adv.geoid) args.push('-g', adv.geoid)
      if (adv.intensity != null) args.push('-is', String(adv.intensity))
      if (adv.interpolationType) args.push('-it', adv.interpolationType)
      if (adv.calculateNormals) args.push('-cn')
      if (adv.mosaicSize != null) args.push('-ms', String(adv.mosaicSize))
      if (adv.rasterMaxSize != null) args.push('-mr', String(adv.rasterMaxSize))
      if (adv.body) args.push('-b', adv.body)
      if (adv.debug) args.push('-d')
      if (adv.leaveTemp) args.push('-lt')
      if (adv.continueFlag) args.push('-c')
      if (adv.skipStandardizationResize) args.push('--skipStandardizationResize')
      if (adv.extraArgs) {
        // 按空格拆分用户输入的自定义的额外参数
        const extra = adv.extraArgs.trim().split(/\s+/)
        args.push(...extra)
      }
    }

    this.log('info', `启动地形生成: java ${args.join(' ')}`)

    return new Promise((resolve) => {
      try {
        this.child = spawn(this.jdkPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        })
      } catch (err) {
        this.log('error', `启动 java 进程失败: ${(err as Error).message}`)
        this.complete(false, `启动 java 进程失败: ${(err as Error).message}`)
        resolve({
          taskId: this.id,
          type: this.type,
          success: false,
          error: `启动 java 进程失败: ${(err as Error).message}`,
        })
        return
      }

      // stdout 逐行读取
      const stdoutReader = createInterface({ input: this.child.stdout!, crlfDelay: Infinity })
      stdoutReader.on('line', (line: string) => {
        if (this.isCancelled) return
        this.log('info', line)
        this.tryParseProgress(line)
      })

      // stderr 逐行读取
      const stderrReader = createInterface({ input: this.child.stderr!, crlfDelay: Infinity })
      stderrReader.on('line', (line: string) => {
        if (this.isCancelled) return
        // 判断是否为错误
        const level = line.toLowerCase().includes('error') || line.toLowerCase().includes('exception')
          ? 'error'
          : 'info'
        this.log(level, line)
        this.tryParseProgress(line)
      })

      this.child.on('close', (code) => {
        stdoutReader.close()
        stderrReader.close()
        if (this.isCancelled) return

        if (code === 0) {
          this.log('info', '地形生成完成')
          this.complete(true)
          resolve({ taskId: this.id, type: this.type, success: true })
        } else {
          const errMsg = `地形生成失败，退出码: ${code}`
          this.log('error', errMsg)
          this.complete(false, errMsg)
          resolve({ taskId: this.id, type: this.type, success: false, error: errMsg })
        }
      })

      this.child.on('error', (err) => {
        stdoutReader.close()
        stderrReader.close()
        if (this.isCancelled) return
        const errMsg = `地形生成进程异常: ${err.message}`
        this.log('error', errMsg)
        this.complete(false, errMsg)
        resolve({ taskId: this.id, type: this.type, success: false, error: errMsg })
      })
    })
  }

  /** 尝试从输出行解析进度信息 */
  private tryParseProgress(line: string): void {
    // jar 可能输出类似 "processed 5/100 tiles" 或百分比
    const percentMatch = line.match(/progress[:\s]*(\d+)%?/i)
      || line.match(/(\d+)%/i)
    if (percentMatch) {
      const pct = parseInt(percentMatch[1], 10)
      this.progress = { current: pct, total: 100 }
      this.emit('progress', { taskId: this.id, current: pct, total: 100 })
      return
    }

    // 尝试匹配 "X / Y" 格式
    const countMatch = line.match(/(\d+)\s*\/\s*(\d+)/)
    if (countMatch) {
      const current = parseInt(countMatch[1], 10)
      const total = parseInt(countMatch[2], 10)
      if (total > 0) {
        this.progress = { current, total }
        this.emit('progress', { taskId: this.id, current, total })
      }
    }
  }

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    // 写入日志文件
    const logger = getGlobalLogger()
    if (logger) {
      switch (level) {
        case 'debug':
          logger.debug(`[terrain-gen] ${message}`)
          break
        case 'info':
          logger.info(`[terrain-gen] ${message}`)
          break
        case 'warn':
          logger.warn(`[terrain-gen] ${message}`)
          break
        case 'error':
          logger.error(`[terrain-gen] ${message}`)
          break
      }
    }

    // 推送到渲染进程
    this.emit('log', {
      taskId: this.id,
      level,
      message,
      timestamp: Date.now(),
    })
  }

  private complete(success: boolean, error?: string): void {
    if (this.isCancelled) return
    this.status = success ? 'completed' : 'failed'
    this.child = null
    const result: TaskResult = { taskId: this.id, type: this.type, success, error }
    this.emit('complete', result)
  }
}
