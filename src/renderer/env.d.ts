/// <reference types="vite/client" />

/** 日志级别 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 日志配置 */
interface LoggingConfig {
  level: LogLevel
  filePath?: string
}

/** 窗口尺寸 */
interface WindowBounds {
  width: number
  height: number
}

/** 关闭行为 */
type CloseBehavior = 'ask' | 'exit' | 'hide'

/** 关闭结果 */
interface CloseResult {
  action: 'exit' | 'hide'
  remember: boolean
}

/** 应用配置 */
interface AppConfig {
  windowBounds: WindowBounds
  isFullScreen: boolean
  isMaximized: boolean
  sidebarCollapsed?: boolean
  closeBehavior: CloseBehavior
  logging: LoggingConfig
  env?: Record<string, string>
}

/** 版本信息 */
interface VersionInfo {
  app: string
  electron: string
  node: string
  chrome: string
  v8: string
}

/** 暴露到渲染进程的 Electron API */
interface ElectronAPI {
  getConfig: () => Promise<AppConfig>
  saveConfig: (config: AppConfig) => Promise<void>
  getConfigPath: () => Promise<string>
  getVersions: () => Promise<VersionInfo>
  onClosePrompt: (cb: () => void) => () => void
  sendCloseResult: (data: CloseResult) => void
}

interface Window {
  electronAPI: ElectronAPI
}
