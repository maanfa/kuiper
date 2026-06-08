<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { OpenOutline } from '@vicons/ionicons5'
import VerticalSplit from '../components/layout/VerticalSplit.vue'
import ToolHeader from '../components/tool/ToolHeader.vue'
import LogOutput from '../components/tool/LogOutput.vue'
import ServerConfigPanel from '../components/tool/ServerConfigPanel.vue'
import { useUiStore } from '../stores/ui'

const ui = useUiStore()
const logRef = ref<InstanceType<typeof LogOutput> | null>(null)
const serverRunning = ref(false)
const serverConfig = ref<ServerConfig>({
  port: 9356,
  prefix: '/files',
  maxConnections: 10,
  files: [],
})

const serverUrl = computed(() =>
  `http://localhost:${serverConfig.value.port}${serverConfig.value.prefix}`,
)

let unlog: (() => void) | null = null
let poolTimer: ReturnType<typeof setInterval> | null = null
const poolStatus = ref<PoolStatus | null>(null)

function startPoolPolling() {
  poolTimer = setInterval(async () => {
    poolStatus.value = await window.electronAPI.serverPoolStatus()
  }, 2000)
}

function stopPoolPolling() {
  if (poolTimer) {
    clearInterval(poolTimer)
    poolTimer = null
  }
  poolStatus.value = null
}

onMounted(async () => {
  const cfg = await window.electronAPI.getConfig()
  if (cfg.server) {
    serverConfig.value = cfg.server
  }
  const status = await window.electronAPI.serverStatus()
  serverRunning.value = status === 'running'
  if (serverRunning.value) {
    startPoolPolling()
    unlog = window.electronAPI.onServerLog((entry: ServerLogEntry) => {
      if (!entry.method) {
        logRef.value?.addLog('warn', `[连接池] ${entry.path}`, entry.timestamp)
        return
      }
      const level = entry.status >= 500 ? 'error' : entry.status >= 400 ? 'warn' : 'info'
      const fid = entry.fileId ? ` [${entry.fileId.slice(0, 8)}]` : ''
      const msg = `${entry.method} ${entry.path} \u2192 ${entry.status} (${entry.duration}ms)${fid}`
      logRef.value?.addLog(level, msg, entry.timestamp)
    })
  }
})

onUnmounted(() => {
  unlog?.()
  stopPoolPolling()
})

function openBrowser() {
  window.electronAPI.openExternal(serverUrl.value)
}

function onConfigChange(config: ServerConfig) {
  serverConfig.value = config
}

async function handleStart() {
  const config = JSON.parse(JSON.stringify(serverConfig.value))
  const result = await window.electronAPI.serverStart(config)
  if (result.success) {
    serverRunning.value = true
    startPoolPolling()
    ui.flashStatusText('服务已启动')
    unlog = window.electronAPI.onServerLog((entry: ServerLogEntry) => {
      if (!entry.method) {
        logRef.value?.addLog('warn', `[连接池] ${entry.path}`, entry.timestamp)
        return
      }
      const level = entry.status >= 500 ? 'error' : entry.status >= 400 ? 'warn' : 'info'
      const fid = entry.fileId ? ` [${entry.fileId.slice(0, 8)}]` : ''
      const msg = `${entry.method} ${entry.path} \u2192 ${entry.status} (${entry.duration}ms)${fid}`
      logRef.value?.addLog(level, msg, entry.timestamp)
    })
    logRef.value?.addLog('info', `服务已启动，监听 http://localhost:${serverConfig.value.port}${serverConfig.value.prefix}`)
  } else {
    ui.flashStatusText(`启动失败: ${result.error}`)
  }
}

async function handleStop() {
  const result = await window.electronAPI.serverStop()
  if (result.success) {
    serverRunning.value = false
    unlog?.()
    unlog = null
    stopPoolPolling()
    ui.flashStatusText('服务已停止')
    logRef.value?.addLog('info', '服务已停止')
  } else {
    ui.flashStatusText(`停止失败: ${result.error}`)
  }
}
</script>

<template>
  <div class="static-server-view">
    <ToolHeader>
      <template #title>
        静态托管服务
        <NTooltip trigger="hover">
          <template #trigger>
            <NButton
              quaternary
              circle
              size="small"
              :disabled="!serverRunning"
              @click="openBrowser"
            >
              <template #icon>
                <NIcon :component="OpenOutline" />
              </template>
            </NButton>
          </template>
          在浏览器中打开
        </NTooltip>
      </template>
    </ToolHeader>

    <VerticalSplit
      :initial-ratio="0.45"
      :min-left-width="320"
      :min-right-width="400"
      storage-key="static-server"
      class="server-body"
    >
      <template #left>
        <div class="left-panel">
          <ServerConfigPanel
            :server-config="serverConfig"
            :server-running="serverRunning"
            :pool-status="poolStatus"
            @update:server-config="onConfigChange"
            @start="handleStart"
            @stop="handleStop"
          />
        </div>
      </template>
      <template #right>
        <LogOutput ref="logRef" />
      </template>
    </VerticalSplit>
  </div>
</template>

<style scoped>
.static-server-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.server-body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  padding: 12px;
  background: #f5f5f5;
}

.left-panel {
  height: 100%;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
