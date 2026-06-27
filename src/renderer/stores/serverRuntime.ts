import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useServerRuntimeStore = defineStore('serverRuntime', () => {
  const staticServerRunning = ref(false)
  const staticFileServerRunning = ref(false)

  function markServerRunning(type: 'static' | 'static-file'): void {
    if (type === 'static') {
      staticServerRunning.value = true
    } else {
      staticFileServerRunning.value = true
    }
  }

  function markServerStopped(type: 'static' | 'static-file'): void {
    if (type === 'static') {
      staticServerRunning.value = false
    } else {
      staticFileServerRunning.value = false
    }
  }

  return { staticServerRunning, staticFileServerRunning, markServerRunning, markServerStopped }
})
