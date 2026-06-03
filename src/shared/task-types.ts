export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type TaskType = 'pack' | 'unpack'

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
