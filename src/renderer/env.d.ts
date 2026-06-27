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

/** 地形切片生成器配置 */
interface TerrainGeneratorConfig {
  jdkPath: string
  jarPath: string
  jdkBuiltIn: boolean
  jarBuiltIn: boolean
  javaOpts?: string
}

/** 静态文件服务配置 */
interface StaticFileServerConfig {
  port: number
  prefix: string
  rootDir: string
  showDirectoryListing: boolean
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
  staticFileServer?: StaticFileServerConfig
  terrainGenerator?: TerrainGeneratorConfig
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
type TaskType = 'pack' | 'unpack' | 'tileset-pack' | 'tileset-unpack' | 'terrain-gen'

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

/** 地形切片生成高级参数 */
interface TerrainGenAdvancedParams {
  geoid?: string
  intensity?: number
  interpolationType?: 'nearest' | 'bilinear'
  calculateNormals?: boolean
  mosaicSize?: number
  rasterMaxSize?: number
  body?: 'earth' | 'moon'
  debug?: boolean
  leaveTemp?: boolean
  continueFlag?: boolean
  skipStandardizationResize?: boolean
  extraArgs?: string
}

/** 地形切片生成参数 */
interface TerrainGenParams {
  tifDir: string
  outputDir: string
  minZoom: number
  maxZoom: number
  jdkPath: string
  jarPath: string
  advanced?: TerrainGenAdvancedParams
}

/** 下载进度 */
interface DownloadProgress {
  received: number
  total: number
  type: 'jdk' | 'jar'
}

/** 下载结果 */
interface DownloadResult {
  success: boolean
  type: 'jdk' | 'jar'
  error?: string
}

/** 任务启动参数 */
interface TaskStartConfig {
  type: 'pack' | 'unpack' | 'tileset-pack' | 'tileset-unpack' | 'terrain-gen'
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
  tifDir?: string
  minZoom?: number
  maxZoom?: number
  jdkPath?: string
  jarPath?: string
  advanced?: TerrainGenAdvancedParams
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

/** 运行中任务信息 */
interface RunningTaskInfo {
  taskId: string
  type: string
  label: string
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
  taskList: () => Promise<RunningTaskInfo[]>
  // Server API
  serverStart: (config: ServerConfig) => Promise<ServerOpResult>
  serverStop: () => Promise<ServerOpResult>
  serverStatus: () => Promise<'running' | 'stopped'>
  serverUpdateFiles: (files: ServerFileEntry[]) => Promise<void>
  serverPoolStatus: () => Promise<PoolStatus | null>
  onServerClosePrompt: (cb: () => void) => () => void
  sendServerCloseResult: (confirmed: boolean) => void
  onServerLog: (cb: (entry: ServerLogEntry) => void) => () => void
  // Static File Server API
  staticFileServerStart: (config: StaticFileServerConfig) => Promise<ServerOpResult>
  staticFileServerStop: () => Promise<ServerOpResult>
  staticFileServerStatus: () => Promise<'running' | 'stopped'>
  onStaticFileServerClosePrompt: (cb: () => void) => () => void
  sendStaticFileServerCloseResult: (confirmed: boolean) => void
  onStaticFileServerLog: (cb: (entry: ServerLogEntry) => void) => () => void
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
  // Terrain Generator API
  checkJava: () => Promise<{ jdkReady: boolean, jarReady: boolean, jdkError: string, jarError: string, javaVersion: string, jdkPath: string, jarPath: string }>
  downloadJdk: () => Promise<DownloadResult>
  downloadJar: () => Promise<DownloadResult>
  onGenDownloadProgress: (cb: (p: DownloadProgress) => void) => () => void
  onGenDownloadComplete: (cb: (result: DownloadResult) => void) => () => void
}

interface Window {
  electronAPI: ElectronAPI
}
