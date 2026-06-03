export interface WorkerFileEntry {
  path: string
  z?: number
  x?: number
  y?: number
  data?: Buffer
}

export interface WorkerCommand {
  type: 'read' | 'write' | 'readInsert'
  id: number
  files: WorkerFileEntry[]
  dbPath?: string
}

export interface WorkerResponse {
  type: 'result' | 'error'
  id: number
  data?: WorkerFileEntry[]
  error?: string
}
