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

/** 服务端文件条目 */
interface ServerFileEntry {
  id: string
  path: string
  enabled: boolean
}

/** 连接池状态 */
interface PoolStatus {
  total: number
  max: number
  entries: { path: string, lastAccess: number }[]
}

/** 服务端配置 */
interface ServerConfig {
  port: number
  prefix: string
  maxConnections: number
  files: ServerFileEntry[]
}

/** 服务端日志条目 */
interface ServerLogEntry {
  timestamp: number
  method: string
  path: string
  status: number
  fileId?: string
  duration: number
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
  server?: ServerConfig
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
type TaskType = 'pack' | 'unpack' | 'tileset-pack' | 'tileset-unpack'

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

/** 3DTiles 打包参数 */
interface TilesetPackParams {
  tilesetJsonPath: string
  outputFile: string
}

/** 3DTiles 解包参数 */
interface TilesetUnpackParams {
  sourceFile: string
  outputDir: string
  clearOutput?: boolean
  batchSize?: number
}

/** 任务启动参数 */
interface TaskStartConfig {
  type: 'pack' | 'unpack' | 'tileset-pack' | 'tileset-unpack'
  workerCount?: number
  batchSize?: number
  sourceDir?: string
  outputFile?: string
  layerName?: string
  sourceFile?: string
  outputDir?: string
  clearOutput?: boolean
  tilesetJsonPath?: string
  tilesetOutputFile?: string
}

/** CZTR 打开结果 */
interface CztrOpenResult {
  valid: boolean
  error?: string
  tables: string[]
  tileCount: number
  fileType?: 'cztr' | 'czts'
}

/** CZTR 查询结果 */
interface CztrQueryResult {
  columns: { title: string, key: string, width?: number }[]
  rows: Record<string, unknown>[]
  error?: string
}

/** CZTR 文件概要 */
interface CztrSummary {
  fileSize: number
  tileCount: number
  minZoom: number | null
  maxZoom: number | null
  minX: number | null
  maxX: number | null
  minY: number | null
  maxY: number | null
  binaryCount?: number
  tilesetCount?: number
  sourceDirectory?: string
}

/** 服务端操作结果 */
interface ServerOpResult {
  success: boolean
  error?: string
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
  // Server API
  serverStart: (config: ServerConfig) => Promise<ServerOpResult>
  serverStop: () => Promise<ServerOpResult>
  serverStatus: () => Promise<'running' | 'stopped'>
  serverUpdateFiles: (files: ServerFileEntry[]) => Promise<void>
  serverPoolStatus: () => Promise<PoolStatus | null>
  onServerClosePrompt: (cb: () => void) => () => void
  sendServerCloseResult: (confirmed: boolean) => void
  onServerLog: (cb: (entry: ServerLogEntry) => void) => () => void
  // Dialog API
  openDirectory: () => Promise<string | null>
  saveFile: (defaultName: string, filters?: { name: string, extensions: string[] }[]) => Promise<string | null>
  openFile: (filters: { name: string, extensions: string[] }[]) => Promise<string | null>
  saveText: (content: string, defaultName: string) => Promise<boolean>
  // Shell API
  openPath: (targetPath: string) => Promise<void>
  openExternal: (url: string) => Promise<void>
  // Window control API
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMaximizeChanged: (cb: (maximized: boolean) => void) => () => void
  isPackaged: () => Promise<boolean>
  // CZTR Inspector API
  cztrOpen: (filePath: string) => Promise<CztrOpenResult>
  cztrQuery: (filePath: string, tableName: string, search?: string) => Promise<CztrQueryResult>
  cztrQueryRow: (filePath: string, tableName: string, whereCol: string, whereVal: unknown) => Promise<Record<string, unknown> | null>
  cztrQueryTile: (filePath: string, z: number, x: number, y: number) => Promise<{ z: number, x: number, y: number, dataSize: number } | null>
  cztrSaveTile: (filePath: string, z: number, x: number, y: number, destPath: string) => Promise<boolean>
  cztrSaveTileByUri: (filePath: string, uri: string, destPath: string) => Promise<boolean>
  cztrSummary: (filePath: string) => Promise<CztrSummary | null>
}

interface Window {
  electronAPI: ElectronAPI
}
