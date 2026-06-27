import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

let tmpDir = ''
let mockExePath = ''
let mockAppPath = ''

vi.mock('electron', () => ({
  app: {
    get isPackaged() { return false },
    getPath() { return mockExePath },
    getAppPath() { return mockAppPath },
  },
  screen: {
    getPrimaryDisplay() {
      return { workAreaSize: { width: 1920, height: 1080 } }
    },
  },
}))

import { deepMerge, loadAppConfig, saveAppConfig, getCenteredBounds } from '../config'
import type { AppConfig, WindowBounds } from '../config'
import { writeFileSync, mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kuiper-config-'))
  mockExePath = join(tmpDir, 'kuiper-box.exe')
  mockAppPath = tmpDir
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('deepMerge (via loadAppConfig)', () => {
  it('部分覆盖与默认深层合并', () => {
    const ymlPath = join(tmpDir, 'app.config.yml')
    writeFileSync(ymlPath, `logging:\n  level: debug\nserver:\n  port: 8080\n`)
    const config = loadAppConfig()
    // 覆盖的字段
    expect(config.logging.level).toBe('debug')
    expect(config.server?.port).toBe(8080)
    // 未覆盖的部分保留默认
    expect(config.server?.prefix).toBe('/files')
    expect(config.closeBehavior).toBe('ask')
    expect(config.task.workerCount).toBe(3)
  })

  it('新增字段与默认合并', () => {
    const ymlPath = join(tmpDir, 'app.config.yml')
    writeFileSync(ymlPath, `custom:\n  key: value\nlogging:\n  level: warn\n`)
    const config = loadAppConfig()
    expect(config.logging.level).toBe('warn')
  })
})

describe('loadAppConfig', () => {
  it('无配置文件返回默认值', () => {
    const config = loadAppConfig()
    expect(config.windowBounds.width).toBe(1280)
    expect(config.windowBounds.height).toBe(720)
    expect(config.logging.level).toBe('info')
    expect(config.task.workerCount).toBe(3)
    expect(config.server?.port).toBe(9356)
  })

  it('空文件返回默认配置', () => {
    const ymlPath = join(tmpDir, 'app.config.yml')
    writeFileSync(ymlPath, '')
    const config = loadAppConfig()
    expect(config.windowBounds.width).toBe(1280)
  })
})

describe('saveAppConfig', () => {
  it('保存配置并插入注释', () => {
    const config: AppConfig = {
      windowBounds: { width: 1280, height: 720 },
      isFullScreen: false,
      isMaximized: false,
      closeBehavior: 'ask',
      logging: { level: 'debug' },
      task: { workerCount: 3 },
    }
    saveAppConfig(config)
    const ymlPath = join(tmpDir, 'app.config.yml')
    expect(existsSync(ymlPath)).toBe(true)
    const content = readFileSync(ymlPath, 'utf-8')
    expect(content).toContain('用户配置')
    expect(content).toContain('logging:')
  })
})

describe('getCenteredBounds', () => {
  it('计算居中位置', () => {
    const bounds: WindowBounds = { width: 960, height: 540 }
    const result = getCenteredBounds(bounds)
    expect(result.width).toBe(960)
    expect(result.height).toBe(540)
    expect(result.x).toBe(Math.round((1920 - 960) / 2))
    expect(result.y).toBe(Math.round((1080 - 540) / 2))
  })

  it('窗口比屏幕宽时钳位', () => {
    const bounds: WindowBounds = { width: 3000, height: 2000 }
    const result = getCenteredBounds(bounds)
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })
})
