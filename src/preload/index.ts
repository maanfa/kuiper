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
    // Dialog API
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    saveFile: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
    openFile: (filters: unknown) => ipcRenderer.invoke('dialog:openFile', filters),
    saveText: (content: string, defaultName: string) => ipcRenderer.invoke('dialog:saveText', content, defaultName),
    // Shell API
    openPath: (targetPath: string) => ipcRenderer.invoke('shell:openPath', targetPath),
  })
} catch (err) {
  console.error('preload 暴露 API 失败:', err)
}
