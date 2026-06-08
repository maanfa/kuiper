<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NInputNumber, NInput, NButton, NSwitch, NScrollbar, NIcon } from 'naive-ui'
import { AddOutline, TrashOutline, ChevronForwardOutline } from '@vicons/ionicons5'

const props = defineProps<{
  serverConfig: ServerConfig
  serverRunning: boolean
  poolStatus: PoolStatus | null
}>()

const emit = defineEmits<{
  'update:serverConfig': [config: ServerConfig]
  start: []
  stop: []
}>()

const localPort = ref(props.serverConfig.port)
const localPrefix = ref(props.serverConfig.prefix)
const localMaxConnections = ref(props.serverConfig.maxConnections ?? 10)
const localFiles = ref<ServerFileEntry[]>([...props.serverConfig.files])

watch(() => props.serverConfig, (cfg) => {
  localPort.value = cfg.port
  localPrefix.value = cfg.prefix
  localMaxConnections.value = cfg.maxConnections ?? 10
  localFiles.value = [...cfg.files]
}, { deep: true })

function sync() {
  emit('update:serverConfig', {
    port: localPort.value,
    prefix: localPrefix.value,
    maxConnections: localMaxConnections.value,
    files: localFiles.value,
  })
  if (props.serverRunning) {
    window.electronAPI.serverUpdateFiles(localFiles.value)
  }
}

function onPortChange(v: number | null) {
  localPort.value = v ?? 9356
  sync()
}

function onPrefixChange(v: string) {
  localPrefix.value = v
  sync()
}

function onMaxConnectionsChange(v: number | null) {
  localMaxConnections.value = v ?? 10
  sync()
}

function computeFileId(path: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  const lower = path.toLowerCase()
  for (let i = 0; i < lower.length; i++) {
    const ch = lower.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 = Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  h1 ^= h1 >>> 16
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 ^= h2 >>> 16
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')).slice(0, 8)
}

async function addFile() {
  const path = await window.electronAPI.openFile([
    { name: 'CZTR/CZTS 文件', extensions: ['cztr', 'czts'] },
  ])
  if (!path) return
  const id = computeFileId(path)
  if (localFiles.value.some((f) => f.path === path)) return
  localFiles.value = [...localFiles.value, { id, path, enabled: true }]
  sync()
}

function removeFile(id: string) {
  const file = localFiles.value.find((f) => f.id === id)
  if (file && file.path === selectedFilePath.value) {
    selectedFilePath.value = null
    selectedSummary.value = null
  }
  localFiles.value = localFiles.value.filter((f) => f.id !== id)
  sync()
}

function clearSelection() {
  selectedFilePath.value = null
  selectedSummary.value = null
}

function onPanelClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.table-row') || target.closest('.n-button') || target.closest('.n-input') || target.closest('.n-input-number')) return
  clearSelection()
}

function toggleFile(id: string, enabled: boolean) {
  localFiles.value = localFiles.value.map((f) =>
    f.id === id ? { ...f, enabled } : f,
  )
  sync()
}

function fileName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1]
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return bytes + ' B'
}

const poolPathSet = computed(() => {
  if (!props.poolStatus) return new Set<string>()
  return new Set(props.poolStatus.entries.map((e) => e.path))
})

const selectedFilePath = ref<string | null>(null)
const selectedSummary = ref<CztrSummary | null>(null)

async function selectFile(path: string) {
  if (selectedFilePath.value === path) return
  selectedFilePath.value = path
  selectedSummary.value = await window.electronAPI.cztrSummary(path)
}

const tableData = computed(() =>
  localFiles.value.map((f) => ({
    id: f.id,
    name: fileName(f.path),
    path: f.path,
    enabled: f.enabled,
  })),
)
</script>

<template>
  <div class="server-config-panel" @click="onPanelClick">
    <div class="config-fields">
      <div class="config-row">
        <label class="config-label">端口</label>
        <NInputNumber
          :value="localPort"
          :min="1024"
          :max="65535"
          :disabled="serverRunning"
          class="config-input"
          @update:value="onPortChange"
        />
      </div>
      <div class="config-row">
        <label class="config-label">前缀路径</label>
        <NInput
          :value="localPrefix"
          :disabled="serverRunning"
          class="config-input"
          placeholder="/files"
          @update:value="onPrefixChange"
        />
      </div>
      <div class="config-row">
        <label class="config-label">最大连接数</label>
        <NInputNumber
          :value="localMaxConnections"
          :min="1"
          :max="100"
          :disabled="serverRunning"
          class="config-input"
          @update:value="onMaxConnectionsChange"
        />
      </div>
    </div>

    <div class="file-info-card" v-if="selectedSummary">
      <div class="file-info-row">
        <span class="file-info-label">路径</span>
        <span class="file-info-value" :title="selectedFilePath!">{{ selectedFilePath }}</span>
      </div>
      <div class="file-info-row">
        <span class="file-info-label">大小</span>
        <span class="file-info-value">{{ formatBytes(selectedSummary.fileSize) }}</span>
      </div>
      <div class="file-info-row">
        <span class="file-info-label">瓦片数</span>
        <span class="file-info-value">{{ selectedSummary.tileCount.toLocaleString() }}</span>
      </div>
    </div>

    <div class="file-info-card file-info-hint" v-else-if="tableData.length > 0">
      点击表格行可查看文件详情
    </div>

    <div class="file-section">
      <div class="section-header">
        <span class="section-title">托管文件</span>
        <NButton
          size="tiny"
          quaternary
          @click="addFile"
        >
          <template #icon>
            <NIcon :component="AddOutline" />
          </template>
          添加
        </NButton>
      </div>

      <NScrollbar v-if="tableData.length > 0" class="file-table-scroll">
        <table class="file-table">
          <thead>
            <tr>
              <th class="col-indicator"></th>
              <th>文件名</th>
              <th class="col-id">ID</th>
              <th class="col-enabled">状态</th>
              <th class="col-connected">连接</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in tableData"
              :key="row.id"
              class="table-row"
              :class="{ 'row-selected': row.path === selectedFilePath }"
              @click="selectFile(row.path)"
            >
              <td class="col-indicator">
                <NIcon v-if="row.path === selectedFilePath" :component="ChevronForwardOutline" size="16" color="#36ad6a" style="vertical-align: middle" />
              </td>
              <td class="col-name">{{ row.name }}</td>
              <td class="col-id">
                <span class="mono">{{ row.id.slice(0, 8) }}</span>
              </td>
              <td class="col-enabled">
                <NSwitch size="small" :value="row.enabled" @update:value="(v: boolean) => toggleFile(row.id, v)" />
              </td>
              <td class="col-connected">
                <span v-if="poolPathSet.has(row.path)" class="connected-label">已连接</span>
              </td>
              <td class="col-actions">
                <NButton size="tiny" secondary @click.stop="removeFile(row.id)">移除</NButton>
              </td>
            </tr>
          </tbody>
        </table>
      </NScrollbar>

      <div v-else class="empty-hint">
        暂无文件，点击「添加」选择 .cztr 或 .czts 文件开始托管
      </div>
    </div>

    <div class="actions-section">
      <NButton
        v-if="serverRunning"
        type="error"
        block
        @click="$emit('stop')"
      >
        停止服务
      </NButton>
      <NButton
        v-else
        type="success"
        block
        :disabled="tableData.length === 0"
        @click="$emit('start')"
      >
        启动服务
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.server-config-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.config-fields {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-label {
  width: 80px;
  font-size: 13px;
  color: #555;
  flex-shrink: 0;
}

.config-input {
  flex: 1;
}

.file-info-card {
  flex-shrink: 0;
  background: #f8faf8;
  border: 1px solid #e0e8e0;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 12px;
}

.file-info-row {
  display: flex;
  align-items: baseline;
  font-size: 12px;
  line-height: 1.8;
}

.file-info-label {
  color: #888;
  width: 44px;
  flex-shrink: 0;
}

.file-info-value {
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-info-hint {
  background: #fff;
  border: 1px dashed #e0e0e0;
  color: #bbb;
  font-size: 13px;
  text-align: center;
  padding: 16px 12px;
}

.file-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 12px;
  min-height: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.file-table-scroll {
  flex: 1;
  min-height: 0;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.file-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 13px;
}

.file-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.file-table th {
  background: rgba(248, 250, 252, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 9px 14px;
  text-align: left;
  font-weight: 600;
  color: #37474f;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 12.5px;
  letter-spacing: 0.3px;
}

.file-table th:first-child {
  border-top-left-radius: 7px;
}

.file-table th:last-child {
  border-top-right-radius: 7px;
}

.file-table td {
  padding: 7px 14px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-indicator {
  width: 32px;
  text-align: center;
  padding: 0 4px !important;
  line-height: 1;
  overflow: visible !important;
  white-space: normal !important;
  text-overflow: clip !important;
}

.col-id { width: 120px; }
.col-enabled { width: 70px; }
.col-connected { width: 60px; }
.col-actions { width: 70px; }

.table-row {
  cursor: pointer;
  transition: background 0.15s;
}

.table-row:hover td {
  background: #f5f5f5;
}

.row-selected td {
  background: #ecf9f2;
}

.row-selected:hover td {
  background: #e3f5e8;
}

.mono {
  font-family: 'Maple Mono', monospace;
  font-size: 12px;
  color: #999;
}

.connected-label {
  color: #36ad6a;
  font-size: 11px;
  font-weight: 600;
}

.empty-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-size: 13px;
  text-align: center;
  padding: 32px 16px;
  border: 1px dashed #e8e8e8;
  border-radius: 8px;
}

.actions-section {
  flex-shrink: 0;
  margin-top: 16px;
}
</style>
