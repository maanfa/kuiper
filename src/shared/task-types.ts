export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type TaskType = 'pack' | 'unpack' | 'tileset-pack' | 'tileset-unpack' | 'terrain-gen'

/** 任务追踪接口，用于 TaskManager 统一管理 */
export interface TrackedTask {
  id: string
  status: TaskStatus
  type: TaskType
  cancel(): void
  on(event: string, handler: (...args: unknown[]) => void): unknown
  off(event: string, handler: (...args: unknown[]) => void): void
}

export interface TaskConfig {
  type: TaskType
  workerCount?: number
  batchSize?: number
  // Pack
  sourceDir?: string
  outputFile?: string
  layerName?: string
  // Unpack
  sourceFile?: string
  outputDir?: string
  clearOutput?: boolean
  // Tileset
  tilesetJsonPath?: string
  tilesetOutputFile?: string
  // Terrain Gen
  tifDir?: string
  minZoom?: number
  maxZoom?: number
  jdkPath?: string
  jarPath?: string
  advanced?: TerrainGenAdvancedParams
}

/** 地形切片生成高级参数（对应 jar CLI 可选参数） */
export interface TerrainGenAdvancedParams {
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
export interface TerrainGenParams {
  tifDir: string
  outputDir: string
  minZoom: number
  maxZoom: number
  jdkPath: string
  jarPath: string
  advanced?: TerrainGenAdvancedParams
}

export interface TaskResult {
  taskId: string
  type: TaskType
  success: boolean
  error?: string
}

export interface TaskLogMessage {
  taskId: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  timestamp: number
}

export interface TaskProgress {
  taskId: string
  current: number
  total: number
}

export interface PackParams {
  sourceDir: string
  outputFile: string
  layerName?: string
}

export interface UnpackParams {
  sourceFile: string
  outputDir: string
  clearOutput?: boolean
}

export interface TilesetPackParams {
  tilesetJsonPath: string
  outputFile: string
}

export interface TilesetUnpackParams {
  sourceFile: string
  outputDir: string
  clearOutput?: boolean
}
