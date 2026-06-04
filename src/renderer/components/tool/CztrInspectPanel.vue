<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NIcon, useMessage } from 'naive-ui'
import { DownloadOutline, ServerOutline } from '@vicons/ionicons5'
import SimpleTable from './SimpleTable.vue'
import type { SimpleColumn } from './SimpleTable.vue'
import JsonViewer from './JsonViewer.vue'
import { saveCztrTileData, formatSize } from '../../utils/cztr-validator'

const props = defineProps<{
  row: Record<string, unknown> | null
  cztrPath: string
  summary: CztrSummary | null
}>()

const message = useMessage()

const isFlat = computed(() => {
  if (!props.row) return false
  return Object.values(props.row).every(
    (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
  )
})

const kvColumns: SimpleColumn[] = [
  { title: '键', key: 'key', width: 60 },
  { title: '值', key: 'value' },
]

const kvRows = computed(() => {
  if (!props.row) return []
  return Object.entries(props.row).map(([k, v]) => ({ key: k, value: String(v) }))
})

const summaryEntries = computed(() => {
  if (!props.summary) return null
  const name = props.cztrPath.split(/[/\\]/).pop() || props.cztrPath
  const zoom = props.summary.minZoom !== null ? `z${props.summary.minZoom} ~ z${props.summary.maxZoom}` : '—'
  return [
    { key: '文件', value: name },
    { key: '路径', value: props.cztrPath },
    { key: '大小', value: formatSize(props.summary.fileSize) },
    { key: '瓦片', value: `${props.summary.tileCount} 个` },
    { key: '级别', value: zoom },
    { key: '范围', value: `x[${props.summary.minX ?? '—'}, ${props.summary.maxX ?? '—'}] y[${props.summary.minY ?? '—'}, ${props.summary.maxY ?? '—'}]` },
  ]
})

const isTile = computed(() => {
  return props.row && 'z' in props.row && 'x' in props.row && 'y' in props.row
})

const tileCoords = computed(() => {
  if (!isTile.value) return null
  return {
    z: Number(props.row!.z),
    x: Number(props.row!.x),
    y: Number(props.row!.y),
  }
})

async function handleSaveTile() {
  if (!tileCoords.value) return
  const { z, x, y } = tileCoords.value
  const defaultName = `tile-${z}-${x}-${y}.terrain`
  const destPath = await window.electronAPI.saveFile(defaultName)
  if (!destPath) return
  const ok = await saveCztrTileData(props.cztrPath, z, x, y, destPath)
  if (ok) {
    message.success(`已保存: ${destPath}`)
  } else {
    message.error('保存失败')
  }
}
</script>

<template>
  <div class="inspect-panel">
    <template v-if="row">
      <div v-if="isFlat" class="kv-view">
        <div class="kv-header">{{ isTile ? '瓦片信息' : '键值对' }}</div>
        <SimpleTable :columns="kvColumns" :rows="kvRows" class="kv-table" />
        <div v-if="isTile" class="kv-actions">
          <NButton size="small" @click="handleSaveTile">
            <template #icon>
              <NIcon size="16" :component="DownloadOutline" />
            </template>
            保存瓦片数据
          </NButton>
        </div>
      </div>
      <JsonViewer v-else :data="row" download-name="layer.json" />
    </template>
    <template v-else-if="summary">
      <div class="summary-view">
        <NIcon size="48" :component="ServerOutline" color="#ccc" />
        <div class="summary-divider" />
        <SimpleTable :columns="[{ title: '属性', key: 'key', width: 60 }, { title: '值', key: 'value' }]" :rows="summaryEntries!" class="summary-table" />
      </div>
    </template>
    <div v-else class="empty">
      <span class="empty-text">打开文件后显示概要信息</span>
    </div>
  </div>
</template>

<style scoped>
.inspect-panel {
  height: 100%;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  color: #ccc;
  font-size: 13px;
}

.kv-view {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.kv-header {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.kv-table {
  flex: 1;
  min-height: 0;
}

.kv-actions {
  margin-top: 12px;
  flex-shrink: 0;
}

.summary-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px 16px;
  overflow: hidden;
}

.summary-divider {
  width: 40px;
  height: 1px;
  background: #e0e0e0;
  margin: 16px 0;
}

.summary-table {
  width: 100%;
  flex: 1;
  min-height: 0;
}
</style>
