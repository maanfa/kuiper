import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Logger } from '../logger'

let tmpDir: string
const loggers: Logger[] = []
function makeLogger(config: { level: 'debug' | 'info' | 'warn' | 'error', filePath?: string }, logDir: string): Logger {
  const l = new Logger(config, logDir)
  loggers.push(l)
  return l
}

beforeEach(() => {
  loggers.length = 0
  tmpDir = mkdtempSync(join(tmpdir(), 'kuiper-logger-'))
})

afterEach(async () => {
  for (const l of loggers) l.close()
  loggers.length = 0
  await new Promise((r) => setTimeout(r, 100))
  try { rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
})

describe('Logger', () => {
  describe('级别过滤', () => {
    let writeSpy: ReturnType<typeof vi.spyOn>
    beforeEach(() => { writeSpy = vi.spyOn(process.stdout, 'write') })
    afterEach(() => { writeSpy.mockRestore() })

    it('info 级别不输出 debug', () => {
      const logger = makeLogger({ level: 'info' }, tmpDir)
      logger.debug('不应出现')
      expect(writeSpy).not.toHaveBeenCalled()
    })

    it('debug 级别输出所有', () => {
      const logger = makeLogger({ level: 'debug' }, tmpDir)
      logger.debug('debug 消息')
      logger.info('info 消息')
      logger.warn('warn 消息')
      logger.error('error 消息')
      expect(writeSpy).toHaveBeenCalledTimes(4)
    })

    it('warn 级别只输出 warn 和 error', () => {
      const logger = makeLogger({ level: 'warn' }, tmpDir)
      logger.info('info')
      logger.warn('warn')
      logger.error('error')
      const calls = writeSpy.mock.calls.map((c) => c[0] as Buffer)
      const lines = calls.map((b) => b.toString())
      expect(lines.some((l) => l.includes('[INFO]'))).toBe(false)
      expect(lines.some((l) => l.includes('[WARN]'))).toBe(true)
      expect(lines.some((l) => l.includes('[ERROR]'))).toBe(true)
    })

    it('error 级别只输出 error', () => {
      const logger = makeLogger({ level: 'error' }, tmpDir)
      logger.warn('warn')
      logger.error('error')
      const calls = writeSpy.mock.calls.map((c) => c[0] as Buffer)
      const lines = calls.map((b) => b.toString())
      expect(lines.some((l) => l.includes('[WARN]'))).toBe(false)
      expect(lines.some((l) => l.includes('[ERROR]'))).toBe(true)
    })
  })

  describe('日志格式', () => {
    let writeSpy: ReturnType<typeof vi.spyOn>
    beforeEach(() => { writeSpy = vi.spyOn(process.stdout, 'write') })
    afterEach(() => { writeSpy.mockRestore() })

    it('包含时间戳和级别', () => {
      const logger = makeLogger({ level: 'debug' }, tmpDir)
      logger.info('测试消息')
      const buf = writeSpy.mock.calls[0][0] as Buffer
      const line = buf.toString()
      expect(line).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\]/)
      expect(line).toContain('[INFO]')
      expect(line).toContain('测试消息')
    })

    it('附加参数合并到消息', () => {
      const logger = makeLogger({ level: 'debug' }, tmpDir)
      logger.info('主消息', { key: 'value' }, 123)
      const buf = writeSpy.mock.calls[0][0] as Buffer
      const line = buf.toString()
      expect(line).toContain('{"key":"value"}')
      expect(line).toContain('123')
    })

    it('Error 对象输出 stack', () => {
      const logger = makeLogger({ level: 'debug' }, tmpDir)
      const err = new Error('test error')
      logger.error('错误', err)
      const buf = writeSpy.mock.calls[0][0] as Buffer
      const line = buf.toString()
      expect(line).toContain('test error')
    })
  })

  describe('文件写入', () => {
    it('写入日志文件', async () => {
      const logDir = join(tmpDir, 'logs')
      const logger = makeLogger({ level: 'info', filePath: 'app' }, logDir)
      logger.info('文件日志')
      logger.close()
      await new Promise((r) => setTimeout(r, 100))

      const files = readdirSync(logDir)
      const logFile = files.find((f) => f.startsWith('app-') && f.endsWith('.log'))
      expect(logFile).toBeTruthy()

      const content = readFileSync(join(logDir, logFile!), 'utf-8')
      expect(content).toContain('[INFO]')
      expect(content).toContain('文件日志')
    })

    it('filePath 为空时不写文件', () => {
      const logger = makeLogger({ level: 'info' }, tmpDir)
      logger.info('不应写文件')
      logger.close()
      const files = readdirSync(tmpDir)
      expect(files.some((f) => f.endsWith('.log'))).toBe(false)
    })

    it('日志目录不存在时自动创建', () => {
      const subDir = join(tmpDir, 'sub', 'logs')
      const logger = makeLogger({ level: 'info', filePath: 'app' }, subDir)
      logger.info('自动创建目录')
      logger.close()
      expect(existsSync(subDir)).toBe(true)
    })
  })
})
