import { contextBridge, ipcRenderer } from 'electron'

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('config:get'),
    saveConfig: (config: unknown) => ipcRenderer.invoke('config:save', config),
    getConfigPath: () => ipcRenderer.invoke('config:path'),
    getVersions: () => ipcRenderer.invoke('config:versions'),
    onClosePrompt: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('close:prompt', handler)
      return () => { ipcRenderer.removeListener('close:prompt', handler) }
    },
    sendCloseResult: (data: unknown) => {
      ipcRenderer.send('close:result', data)
    },
    // Task API
    taskStart: (config: unknown) => ipcRenderer.invoke('task:start', config),
    taskCancel: (taskId: string) => ipcRenderer.invoke('task:cancel', taskId),
    onTaskLog: (cb: (msg: unknown) => void) => {
      const handler = (_event: unknown, msg: unknown) => cb(msg)
      ipcRenderer.on('task:log', handler)
      return () => { ipcRenderer.removeListener('task:log', handler) }
    },
    onTaskProgress: (cb: (p: unknown) => void) => {
      const handler = (_event: unknown, p: unknown) => cb(p)
      ipcRenderer.on('task:progress', handler)
      return () => { ipcRenderer.removeListener('task:progress', handler) }
    },
    onTaskComplete: (cb: (result: unknown) => void) => {
      const handler = (_event: unknown, result: unknown) => cb(result)
      ipcRenderer.on('task:complete', handler)
      return () => { ipcRenderer.removeListener('task:complete', handler) }
    },
    // Server API
    serverStart: (config: unknown) => ipcRenderer.invoke('server:start', config),
    serverStop: () => ipcRenderer.invoke('server:stop'),
    serverStatus: () => ipcRenderer.invoke('server:status'),
    serverUpdateFiles: (files: unknown) => ipcRenderer.invoke('server:update-files', files),
    serverPoolStatus: () => ipcRenderer.invoke('server:pool-status'),
    onServerClosePrompt: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('server:close-prompt', handler)
      return () => { ipcRenderer.removeListener('server:close-prompt', handler) }
    },
    sendServerCloseResult: (confirmed: boolean) => {
      ipcRenderer.send('server:close-result', confirmed)
    },
    onServerLog: (cb: (entry: unknown) => void) => {
      const handler = (_event: unknown, entry: unknown) => cb(entry)
      ipcRenderer.on('server:log', handler)
      return () => { ipcRenderer.removeListener('server:log', handler) }
    },
    // Dialog API
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    saveFile: (defaultName: string, filters?: unknown) => ipcRenderer.invoke('dialog:saveFile', defaultName, filters),
    openFile: (filters: unknown) => ipcRenderer.invoke('dialog:openFile', filters),
    saveText: (content: string, defaultName: string) => ipcRenderer.invoke('dialog:saveText', content, defaultName),
    // Shell API
    openPath: (targetPath: string) => ipcRenderer.invoke('shell:openPath', targetPath),
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    // Window control API
    minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
    maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
    closeWindow: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChanged: (cb: (maximized: boolean) => void) => {
      const handler = (_event: unknown, maximized: boolean) => cb(maximized)
      ipcRenderer.on('window:maximize-changed', handler)
      return () => { ipcRenderer.removeListener('window:maximize-changed', handler) }
    },
    isPackaged: () => ipcRenderer.invoke('app:isPackaged'),
    // CZTR Inspector API
    cztrOpen: (filePath: string) => ipcRenderer.invoke('cztr:open', filePath),
    cztrQuery: (filePath: string, tableName: string, search?: string) =>
      ipcRenderer.invoke('cztr:query', filePath, tableName, search),
    cztrQueryRow: (filePath: string, tableName: string, whereCol: string, whereVal: unknown) =>
      ipcRenderer.invoke('cztr:query-row', filePath, tableName, whereCol, whereVal),
    cztrQueryTile: (filePath: string, z: number, x: number, y: number) =>
      ipcRenderer.invoke('cztr:query-tile', filePath, z, x, y),
    cztrSaveTile: (filePath: string, z: number, x: number, y: number, destPath: string) =>
      ipcRenderer.invoke('cztr:save-tile', filePath, z, x, y, destPath),
    cztrSaveTileByUri: (filePath: string, uri: string, destPath: string) =>
      ipcRenderer.invoke('cztr:save-tile-by-uri', filePath, uri, destPath),
    cztrSummary: (filePath: string) => ipcRenderer.invoke('cztr:summary', filePath),
  })
} catch (err) {
  console.error('preload 暴露 API 失败:', err)
}
