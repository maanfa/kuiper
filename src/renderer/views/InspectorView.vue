<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NIcon, NTooltip, NSwitch, useMessage, useDialog } from 'naive-ui'
import { CloseOutline } from '@vicons/ionicons5'
import ToolHeader from '../components/tool/ToolHeader.vue'
import VerticalSplit from '../components/layout/VerticalSplit.vue'
import PathInput from '../components/form/PathInput.vue'
import FileTabsPanel from '../components/tool/FileTabsPanel.vue'
import type { OpenedFile } from '../components/tool/FileTabsPanel.vue'
import CztrInspectPanel from '../components/tool/CztrInspectPanel.vue'
import { openCztrFile, queryCztrTable, queryCztrRow, queryCztrTileInfo, formatSize, fetchSummary } from '../utils/cztr-validator'

const message = useMessage()
const dialog = useDialog()

const openedFiles = ref<OpenedFile[]>([])
const activeTabName = ref('')
const inputPath = ref('')
const selectedRow = ref<Record<string, unknown> | null>(null)
const summary = ref<CztrSummary | null>(null)
const skipConfirm = ref(false)

const cztrFilter = [{ name: 'CZTR 地形包', extensions: ['cztr'] as string[] }]

function getActiveFile(): OpenedFile | undefined {
  return openedFiles.value.find((f) => f.path === activeTabName.value)
}

function createFile(path: string, name: string, tables: string[], tileCount: number): OpenedFile {
  return {
    path,
    name,
    tables,
    tileCount,
    activeTable: tables[0] || '',
    search: '',
    columns: [],
    rows: [],
  }
}

async function handleFileOpen(path: string) {
  if (!path) return
  inputPath.value = ''

  const existing = openedFiles.value.find((f) => f.path === path)
  if (existing) {
    activeTabName.value = path
    summary.value = await fetchSummary(path)
    return
  }

  const result = await openCztrFile(path)
  if (!result.valid) {
    message.error(result.error || '无效的 CZTR 文件')
    return
  }

  const name = path.split(/[/\\]/).pop() || path
  const file = createFile(path, name, result.tables, result.tileCount)
  openedFiles.value.push(file)
  activeTabName.value = path
  loadTable(openedFiles.value[openedFiles.value.length - 1])
  summary.value = await fetchSummary(path)
}

async function loadTable(file: OpenedFile, search?: string) {
  try {
    const result = await queryCztrTable(file.path, file.activeTable, search)
    file.columns = result.columns
    file.rows = result.rows
    file.search = search ?? ''
    if (result.error) {
      message.error(result.error)
    }
  } catch (err) {
    message.error(`查询失败: ${(err as Error).message}`)
  }
}

async function handleRowSelect(row: Record<string, unknown>) {
  const file = getActiveFile()
  if (!file) {
    selectedRow.value = null
    return
  }

  if (file.activeTable === 'metadata') {
    if (row.key === 'layer_json') {
      const fullRow = await queryCztrRow(file.path, 'metadata', 'key', 'layer_json')
      if (!fullRow) {
        selectedRow.value = null
        return
      }
      const value = fullRow.value
      if (typeof value === 'string') {
        try {
          selectedRow.value = JSON.parse(value) as Record<string, unknown>
        } catch {
          selectedRow.value = { value }
        }
      } else {
        selectedRow.value = { value }
      }
      return
    }
    selectedRow.value = null
    return
  }

  if (file.activeTable === 'tiles') {
    const z = Number(row.z)
    const x = Number(row.x)
    const y = Number(row.y)
    if (isNaN(z) || isNaN(x) || isNaN(y)) {
      selectedRow.value = null
      return
    }
    const info = await queryCztrTileInfo(file.path, z, x, y)
    if (!info) {
      selectedRow.value = null
      return
    }
    selectedRow.value = { z: info.z, x: info.x, y: info.y, 大小: formatSize(info.dataSize) }
    return
  }

  selectedRow.value = null
}

function handleTableChange(value: string) {
  const file = getActiveFile()
  if (!file) return
  file.activeTable = value
  file.search = ''
  loadTable(file)
}

function handleSearch(value: string) {
  const file = getActiveFile()
  if (!file) return
  file.search = value
  loadTable(file, value)
}

function doCloseTab(path: string) {
  const idx = openedFiles.value.findIndex((f) => f.path === path)
  if (idx === -1) return
  openedFiles.value.splice(idx, 1)
  if (activeTabName.value === path) {
    selectedRow.value = null
    summary.value = null
    activeTabName.value = openedFiles.value.length > 0
      ? openedFiles.value[Math.min(idx, openedFiles.value.length - 1)].path
      : ''
  }
}

async function handleTabClose(path: string) {
  if (skipConfirm.value) {
    doCloseTab(path)
    return
  }
  const file = openedFiles.value.find((f) => f.path === path)
  const name = file?.name || path
  dialog.warning({
    title: '关闭标签',
    content: `确定要关闭「${name}」吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => doCloseTab(path),
  })
}

async function handleCloseAll() {
  if (openedFiles.value.length === 0) return
  if (skipConfirm.value) {
    openedFiles.value = []
    activeTabName.value = ''
    selectedRow.value = null
    summary.value = null
    return
  }
  dialog.warning({
    title: '关闭全部',
    content: `确定要关闭全部 ${openedFiles.value.length} 个标签吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      openedFiles.value = []
      activeTabName.value = ''
      selectedRow.value = null
      summary.value = null
    },
  })
}
</script>

<template>
  <div class="inspector-view">
    <ToolHeader>
      <template #title>
        <span>文件查看器</span>
      </template>
      <template #actions>
        <label class="confirm-label">
          <span class="confirm-text">关闭免确认</span>
          <NSwitch v-model:value="skipConfirm" size="small" />
        </label>
        <span class="header-divider" />
        <PathInput
          v-model="inputPath"
          placeholder="选择文件"
          select-mode="file"
          :select-filters="cztrFilter"
          class="header-path-input"
          @update:model-value="handleFileOpen"
        />
      </template>
    </ToolHeader>

    <VerticalSplit
      :initial-ratio="0.55"
      :min-left-width="300"
      :min-right-width="400"
      class="inspector-body"
    >
      <template #left>
        <FileTabsPanel
          v-model:active-tab-name="activeTabName"
          :files="openedFiles"
          @tab-close="handleTabClose"
          @close-all="handleCloseAll"
          @table-change="handleTableChange"
          @search="handleSearch"
          @row-select="handleRowSelect"
        >
          <template #suffix>
            <div style="margin-right: 8px;">
              <NTooltip v-if="openedFiles.length > 0">
                <template #trigger>
                  <NButton size="small" quaternary circle @click="handleCloseAll">
                    <template #icon>
                      <NIcon size="16" :component="CloseOutline" />
                    </template>
                  </NButton>
                </template>
                关闭全部标签
              </NTooltip>
            </div>
          </template>
        </FileTabsPanel>
      </template>
      <template #right>
        <CztrInspectPanel :row="selectedRow" :cztr-path="activeTabName" :summary="summary" />
      </template>
    </VerticalSplit>
  </div>
</template>

<style scoped>
.inspector-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.inspector-body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  padding: 12px;
  background: #f5f5f5;
}

.header-path-input {
  width: 520px;
}

.header-path-input :deep(.n-input) {
  height: 32px;
}

.confirm-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.confirm-text {
  font-size: 12px;
  color: #888;
}

.header-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
}
</style>
