import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useServerRuntimeStore = defineStore('serverRuntime', () => {
  const staticServerRunning = ref(false)
  const staticFileServerRunning = ref(false)

  // 初始化：查询当前状态
  const api = window.electronAPI
  if (api) {
    api.serverStatus().then((s) => { staticServerRunning.value = s === 'running' })
    api.staticFileServerStatus().then((s) => { staticFileServerRunning.value = s === 'running' })

    // 订阅主进程推送的状态变更
    api.onServerStatusChanged((data) => {
      staticServerRunning.value = data.running
    })
    api.onStaticFileServerStatusChanged((data) => {
      staticFileServerRunning.value = data.running
    })
  }

  return { staticServerRunning, staticFileServerRunning }
})
