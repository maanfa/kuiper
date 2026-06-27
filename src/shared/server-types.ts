export interface ServerFileEntry {
  id: string
  path: string
  enabled: boolean
}

export interface ServerConfig {
  port: number
  prefix: string
  maxConnections: number
  files: ServerFileEntry[]
}

export interface ServerLogEntry {
  timestamp: number
  method: string
  path: string
  status: number
  fileId?: string
  duration: number
}

export interface ServerFileItem {
  id: string
  name: string
  path: string
}

export interface ServerListResponse {
  count: number
  items: ServerFileItem[]
}

export interface ServerErrorResponse {
  error: string
}

export interface ServerFileMetadata {
  id: string
  name: string
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

export interface StaticFileServerConfig {
  port: number
  prefix: string
  rootDir: string
  showDirectoryListing: boolean
}

export interface RunningTaskInfo {
  taskId: string
  type: string
  label: string
}
