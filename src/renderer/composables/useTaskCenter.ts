import { ref, onUnmounted } from 'vue'
import { useServerRuntimeStore } from '../stores/serverRuntime'

export function useTaskCenter() {
  const serverRuntime = useServerRuntimeStore()
  const tasks = ref<RunningTaskInfo[]>([])
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function refreshTasks() {
    try {
      tasks.value = await window.electronAPI.taskList()
    } catch {
      // ignore
    }
  }

  function startPolling() {
    refreshTasks()
    pollTimer = setInterval(refreshTasks, 3000)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  async function stopStaticServer() {
    await window.electronAPI.serverStop()
    serverRuntime.markServerStopped('static')
  }

  async function stopStaticFileServer() {
    await window.electronAPI.staticFileServerStop()
    serverRuntime.markServerStopped('static-file')
  }

  async function cancelTask(taskId: string) {
    await window.electronAPI.taskCancel(taskId)
    refreshTasks()
  }

  onUnmounted(() => {
    stopPolling()
  })

  return {
    serverRuntime,
    tasks,
    refreshTasks,
    startPolling,
    stopPolling,
    stopStaticServer,
    stopStaticFileServer,
    cancelTask,
  }
}
