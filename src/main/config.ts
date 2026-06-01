import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { app, screen } from 'electron'
import { parse, stringify } from 'yaml'

/** 窗口尺寸配置（位置由启动时自动居中计算） */
export interface WindowBounds {
  width: number
  height: number
}

/** 日志系统配置 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error'
  filePath?: string
}

/** 关闭行为 */
export type CloseBehavior = 'ask' | 'exit' | 'hide'

/** 应用完整配置 */
export interface AppConfig {
  windowBounds: WindowBounds
  isFullScreen: boolean
  isMaximized: boolean
  sidebarCollapsed?: boolean
  closeBehavior: CloseBehavior
  logging: LoggingConfig
  env?: Record<string, string>
}

/**
 * 获取配置文件路径
 * - 开发模式：项目根目录
 * - 打包模式：可执行程序同目录
 */
export function getConfigPath(): string {
  if (app.isPackaged) {
    return join(dirname(app.getPath('exe')), 'app.config.yml')
  }
  return join(app.getAppPath(), 'app.config.yml')
}

/** 默认配置 */
const DEFAULT_CONFIG: AppConfig = {
  windowBounds: { width: 1280, height: 720 },
  isFullScreen: false,
  isMaximized: false,
  sidebarCollapsed: false,
  closeBehavior: 'ask',
  logging: { level: 'info' },
  env: {},
}

/**
 * 深度合并两个对象，overrides 中的值覆盖 defaults
 * @param defaults - 默认配置
 * @param overrides - 用户配置覆盖值
 */
function deepMerge(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...defaults }
  for (const key of Object.keys(overrides)) {
    const dv = defaults[key]
    const ov = overrides[key]
    if (
      ov != null
      && typeof dv === 'object'
      && dv !== null
      && typeof ov === 'object'
      && !Array.isArray(dv)
      && !Array.isArray(ov)
    ) {
      result[key] = deepMerge(
        dv as Record<string, unknown>,
        ov as Record<string, unknown>,
      )
    } else {
      result[key] = ov
    }
  }
  return result
}

/**
 * 加载应用配置
 *
 * 从 app.config.yml 读取，文件不存在或解析失败时返回默认配置。
 * 用户配置与默认配置做深度合并，确保新增字段有默认值。
 */
export function loadAppConfig(): AppConfig {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG, windowBounds: { ...DEFAULT_CONFIG.windowBounds } }
  }
  try {
    const raw = readFileSync(configPath, 'utf-8')
    const parsed = parse(raw) ?? {}
    return deepMerge(
      structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>,
      parsed as Record<string, unknown>,
    ) as unknown as AppConfig
  } catch {
    return { ...DEFAULT_CONFIG, windowBounds: { ...DEFAULT_CONFIG.windowBounds } }
  }
}

/**
 * 保存应用配置到 app.config.yml，在 logging 前插入分区注释
 * @param config - 待保存的完整配置对象
 */
export function saveAppConfig(config: AppConfig): void {
  const configPath = getConfigPath()
  try {
    const yamlStr = stringify(config)
    // 在 logging: 行前插入用户配置分区注释
    const commented = yamlStr.replace(
      /^logging:/m,
      '\n# ===== 用户配置（可在设置页面中修改）=====\nlogging:',
    )
    writeFileSync(configPath, commented, 'utf-8')
  } catch (err) {
    console.error('保存配置文件失败:', err)
  }
}

/**
 * 计算窗口居中位置并钳位到屏幕工作区
 *
 * 始终居中，若记忆的宽高超过当前屏幕则收缩。
 * @returns 包含 x/y 的完整边界（仅用于创建窗口，不写入配置）
 */
export function getCenteredBounds(
  bounds: WindowBounds,
): WindowBounds & { x: number, y: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize

  let { width, height } = bounds
  if (width > screenW) width = screenW
  if (height > screenH) height = screenH

  return {
    x: Math.round((screenW - width) / 2),
    y: Math.round((screenH - height) / 2),
    width,
    height,
  }
}
