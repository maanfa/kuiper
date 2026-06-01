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
  })
} catch (err) {
  console.error('preload 暴露 API 失败:', err)
}
