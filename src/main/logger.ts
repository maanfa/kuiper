import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { WriteStream } from 'node:fs'

/** 日志级别名称 */
type LogLevelName = 'debug' | 'info' | 'warn' | 'error'

/** 日志配置接口 */
interface LoggingConfig {
  level: LogLevelName
  filePath?: string
}

/** 日志级别对应的数值，用于阈值比较 */
const LEVEL_VALUES: Record<LogLevelName, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * 数字补零
 * @param n - 原始数字
 * @param len - 目标长度，默认 2
 */
function pad(n: number, len = 2): string {
  return n.toString().padStart(len, '0')
}

/**
 * 生成当前时间戳字符串，格式：YYYY-MM-DD HH:mm:ss.SSS
 */
function timestamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

/**
 * 将任意类型的日志参数转为字符串，便于写入日志
 * @param arg - 日志附加参数
 */
function stringify(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack || arg.message
  }
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg)
    } catch {
      return String(arg)
    }
  }
  return String(arg)
}

/**
 * 轻量级日志记录器
 *
 * 同时输出到控制台 stdout 和日志文件（可选）。日志文件按天滚动，
 * 编码统一使用 UTF-8，确保中文不乱码。
 *
 * @example
 * ```ts
 * const logger = new Logger({ level: 'info', filePath: 'logs' }, '/app/logs')
 * logger.info('应用启动')
 * ```
 */
export class Logger {
  /** 当前日志级别对应的数值阈值 */
  private levelValue: number
  /** 日志文件写入流，无文件输出时为 null */
  private stream: WriteStream | null = null
  /** 日志配置 */
  private config: LoggingConfig
  /** 日志目录绝对路径 */
  private logDir: string
  /** 当前日志文件对应的日期，用于判断是否需要滚动 */
  private currentDate: string

  /**
   * @param config - 日志配置，包含级别和文件路径
   * @param logDir - 日志文件输出目录的绝对路径，为空时不写文件
   */
  constructor(config: LoggingConfig, logDir: string) {
    this.config = config
    this.levelValue = LEVEL_VALUES[config.level] ?? 1
    this.logDir = logDir
    this.currentDate = this.dateString()
    if (config.filePath && logDir) {
      this.ensureDir()
      this.openStream()
    }
  }

  /** 获取当前日期字符串 YYYY-MM-DD，用于日志文件名 */
  private dateString(): string {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  /** 确保日志目录存在，不存在则递归创建 */
  private ensureDir(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }
  }

  /** 打开日志文件写入流，文件名为 app-YYYY-MM-DD.log */
  private openStream(): void {
    const filePath = join(this.logDir, `app-${this.currentDate}.log`)
    this.stream = createWriteStream(filePath, { encoding: 'utf-8', flags: 'a' })
  }

  /** 跨天时自动关闭当前流并打开新的日志文件 */
  private rotateIfNeeded(): void {
    const today = this.dateString()
    if (today !== this.currentDate) {
      this.currentDate = today
      this.stream?.end()
      this.openStream()
    }
  }

  /** 判断指定级别是否应被记录 */
  private shouldLog(level: LogLevelName): boolean {
    return LEVEL_VALUES[level] >= this.levelValue
  }

  /** 核心写入方法，同时输出到 stdout 和日志文件 */
  private write(level: string, msg: string): void {
    const line = `[${timestamp()}] [${level}] ${msg}\n`
    // 使用 Buffer 直接写入，绕过 Windows 控制台代码页转换，避免中文乱码
    process.stdout.write(Buffer.from(line, 'utf-8'))
    if (this.stream) {
      this.rotateIfNeeded()
      this.stream.write(line, 'utf-8')
    }
  }

  /** 拼接消息和附加参数 */
  private formatMsg(msg: string, args: unknown[]): string {
    if (args.length === 0) return msg
    return msg + ' ' + args.map(stringify).join(' ')
  }

  /** 输出 DEBUG 级别日志 */
  debug(msg: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return
    this.write('DEBUG', this.formatMsg(msg, args))
  }

  /** 输出 INFO 级别日志 */
  info(msg: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return
    this.write('INFO', this.formatMsg(msg, args))
  }

  /** 输出 WARN 级别日志 */
  warn(msg: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return
    this.write('WARN', this.formatMsg(msg, args))
  }

  /** 输出 ERROR 级别日志 */
  error(msg: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return
    this.write('ERROR', this.formatMsg(msg, args))
  }

  /** 关闭日志文件写入流并释放资源 */
  close(): void {
    this.stream?.end()
    this.stream = null
  }
}
