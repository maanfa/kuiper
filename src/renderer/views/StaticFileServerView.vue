<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { OpenOutline } from '@vicons/ionicons5'
import VerticalSplit from '../components/layout/VerticalSplit.vue'
import ToolHeader from '../components/tool/ToolHeader.vue'
import LogOutput from '../components/tool/LogOutput.vue'
import StaticFileServerConfigPanel from '../components/tool/StaticFileServerConfigPanel.vue'
import ServerCloseDialog from '../components/dialog/ServerCloseDialog.vue'
import { useUiStore } from '../stores/ui'
import { useServerRuntimeStore } from '../stores/serverRuntime'

const ui = useUiStore()
const serverRuntime = useServerRuntimeStore()
const logRef = ref<InstanceType<typeof LogOutput> | null>(null)
const serverRunning = ref(false)
const serverConfig = ref<StaticFileServerConfig>({
  port: 9357,
  prefix: '/',
  rootDir: '',
  showDirectoryListing: true,
})
const showCloseDialog = ref(false)

const serverUrl = computed(() =>
  `http://localhost:${serverConfig.value.port}${serverConfig.value.prefix}`,
)

let unlog: (() => void) | null = null
let unclose: (() => void) | null = null

onMounted(async () => {
  const cfg = await window.electronAPI.getConfig()
  if (cfg.staticFileServer) {
    serverConfig.value = cfg.staticFileServer
  }
  const status = await window.electronAPI.staticFileServerStatus()
  serverRunning.value = status === 'running'
  if (serverRunning.value) {
    serverRuntime.markServerRunning('static-file')
    unlog = window.electronAPI.onStaticFileServerLog((entry: ServerLogEntry) => {
      const level = entry.status >= 500 ? 'error' : entry.status >= 400 ? 'warn' : 'info'
      const msg = `${entry.method} ${entry.path} \u2192 ${entry.status} (${entry.duration}ms)`
      logRef.value?.addLog(level, msg, entry.timestamp)
    })
  }

  unclose = window.electronAPI.onStaticFileServerClosePrompt(() => {
    showCloseDialog.value = true
  })
})

onUnmounted(() => {
  unlog?.()
  unclose?.()
})

function onCloseConfirm() {
  window.electronAPI.sendStaticFileServerCloseResult(true)
}

function onCloseCancel() {
  showCloseDialog.value = false
  window.electronAPI.sendStaticFileServerCloseResult(false)
}

function openBrowser() {
  window.electronAPI.openExternal(serverUrl.value)
}

function onConfigChange(config: StaticFileServerConfig) {
  serverConfig.value = config
}

async function handleStart() {
  const config = JSON.parse(JSON.stringify(serverConfig.value))
  const result = await window.electronAPI.staticFileServerStart(config)
  if (result.success) {
    serverRunning.value = true
    serverRuntime.markServerRunning('static-file')
    ui.flashStatusText('服务已启动')
    unlog = window.electronAPI.onStaticFileServerLog((entry: ServerLogEntry) => {
      const level = entry.status >= 500 ? 'error' : entry.status >= 400 ? 'warn' : 'info'
      const msg = `${entry.method} ${entry.path} \u2192 ${entry.status} (${entry.duration}ms)`
      logRef.value?.addLog(level, msg, entry.timestamp)
    })
    logRef.value?.addLog('info', `服务已启动，监听 http://localhost:${config.port}${config.prefix}`)
    logRef.value?.addLog('info', `根目录: ${config.rootDir}`)
  } else {
    ui.flashStatusText(`启动失败: ${result.error}`)
  }
}

async function handleStop() {
  const result = await window.electronAPI.staticFileServerStop()
  if (result.success) {
    serverRunning.value = false
    serverRuntime.markServerStopped('static-file')
    unlog?.()
    unlog = null
    ui.flashStatusText('服务已停止')
    logRef.value?.addLog('info', '服务已停止')
  } else {
    ui.flashStatusText(`停止失败: ${result.error}`)
  }
}
</script>

<template>
  <div class="static-file-server-view">
    <ToolHeader>
      <template #title>
        静态文件服务
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
      storage-key="static-file-server"
      class="server-body"
    >
      <template #left>
        <div class="left-panel">
          <StaticFileServerConfigPanel
            :server-config="serverConfig"
            :server-running="serverRunning"
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

    <ServerCloseDialog
      :show="showCloseDialog"
      @confirm="onCloseConfirm"
      @close="onCloseCancel"
    />
  </div>
</template>

<style scoped>
.static-file-server-view {
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
