/// <reference types="vite/client" />

/** 日志级别 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 日志配置 */
interface LoggingConfig {
  level: LogLevel
  filePath?: string
}

/** 任务系统配置 */
interface TaskWorkerConfig {
  workerCount: number
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
  task: TaskWorkerConfig
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

/** 任务类型 */
type TaskType = 'pack' | 'unpack'

/** 任务日志消息 */
interface TileLogMessage {
  taskId: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  timestamp: number
}

/** 任务进度 */
interface TileProgress {
  taskId: string
  current: number
  total: number
}

/** 任务结果 */
interface TileOpResult {
  taskId: string
  type: TaskType
  success: boolean
  error?: string
}

/** 打包参数 */
interface PackParams {
  sourceDir: string
  outputFile: string
  layerName?: string
  batchSize?: number
}

/** 解包参数 */
interface UnpackParams {
  sourceFile: string
  outputDir: string
  clearOutput?: boolean
  batchSize?: number
}

/** 任务启动参数 */
interface TaskStartConfig {
  type: 'pack' | 'unpack'
  workerCount?: number
  batchSize?: number
  sourceDir?: string
  outputFile?: string
  layerName?: string
  sourceFile?: string
  outputDir?: string
  clearOutput?: boolean
}

/** 暴露到渲染进程的 Electron API */
interface ElectronAPI {
  getConfig: () => Promise<AppConfig>
  saveConfig: (config: AppConfig) => Promise<void>
  getConfigPath: () => Promise<string>
  getVersions: () => Promise<VersionInfo>
  onClosePrompt: (cb: () => void) => () => void
  sendCloseResult: (data: CloseResult) => void
  // Task API
  taskStart: (config: TaskStartConfig) => Promise<string>
  taskCancel: (taskId: string) => Promise<boolean>
  onTaskLog: (cb: (msg: TileLogMessage) => void) => () => void
  onTaskProgress: (cb: (p: TileProgress) => void) => () => void
  onTaskComplete: (cb: (result: TileOpResult) => void) => () => void
  // Dialog API
  openDirectory: () => Promise<string | null>
  saveFile: (defaultName: string) => Promise<string | null>
  openFile: (filters: { name: string, extensions: string[] }[]) => Promise<string | null>
  saveText: (content: string, defaultName: string) => Promise<boolean>
  // Shell API
  openPath: (targetPath: string) => Promise<void>
}

interface Window {
  electronAPI: ElectronAPI
}
