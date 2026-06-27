import { ref, onUnmounted } from 'vue'
import { useServerRuntimeStore } from '../stores/serverRuntime'

export function useTaskCenter() {
  const serverRuntime = useServerRuntimeStore()
  const tasks = ref<RunningTaskInfo[]>([])
  let unsub: (() => void) | null = null

  async function refreshTasks() {
    try {
      tasks.value = await window.electronAPI.taskList()
    } catch {
      // ignore
    }
  }

  function startPolling() {
    refreshTasks()
    unsub = window.electronAPI.onTaskListChanged((list) => {
      tasks.value = list
    })
  }

  function stopPolling() {
    unsub?.()
    unsub = null
  }

  async function stopStaticServer() {
    await window.electronAPI.serverStop()
  }

  async function stopStaticFileServer() {
    await window.electronAPI.staticFileServerStop()
  }

  async function cancelTask(taskId: string) {
    await window.electronAPI.taskCancel(taskId)
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
