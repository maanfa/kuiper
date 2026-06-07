<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NIcon, useMessage } from 'naive-ui'
import { DownloadOutline, ServerOutline } from '@vicons/ionicons5'
import SimpleTable from './SimpleTable.vue'
import type { SimpleColumn } from './SimpleTable.vue'
import JsonViewer from './JsonViewer.vue'
import { saveTile, saveTileByUri } from '../../utils/tile-helper'
import { formatSize } from '../../utils/file-inspector'

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
  const entries: { key: string, value: string }[] = []

  entries.push({ key: '文件', value: name })
  entries.push({ key: '路径', value: props.cztrPath })
  entries.push({ key: '大小', value: formatSize(props.summary.fileSize) })

  // czts 文件：显示 binary_count / tileset_count
  if (props.summary.binaryCount != null) {
    entries.push({ key: '二进制瓦片', value: `${props.summary.binaryCount} 个` })
  }
  if (props.summary.tilesetCount != null) {
    entries.push({ key: 'tileset', value: `${props.summary.tilesetCount} 个` })
  }
  if (props.summary.sourceDirectory) {
    entries.push({ key: '源目录', value: props.summary.sourceDirectory })
  }

  // cztr 文件：显示瓦片总数和级别/范围
  if (props.summary.binaryCount == null) {
    entries.push({ key: '瓦片', value: `${props.summary.tileCount} 个` })
  }
  const zoom = props.summary.minZoom !== null ? `z${props.summary.minZoom} ~ z${props.summary.maxZoom}` : null
  if (zoom) {
    entries.push({ key: '级别', value: zoom })
  }
  if (props.summary.minX != null) {
    entries.push({ key: '范围', value: `x[${props.summary.minX}, ${props.summary.maxX}] y[${props.summary.minY}, ${props.summary.maxY}]` })
  }

  return entries
})

const isTile = computed(() => {
  if (!props.row) return false
  // cztr 瓦片：z/x/y 主键
  if ('z' in props.row && 'x' in props.row && 'y' in props.row) return true
  // czts 瓦片：包含 文件/格式/路径/大小 键
  if ('文件' in props.row && '路径' in props.row && '格式' in props.row) return true
  return false
})

const isCztsTile = computed(() => {
  if (!props.row) return false
  return '文件' in props.row && '路径' in props.row && '格式' in props.row && !('z' in props.row)
})

const tileCoords = computed(() => {
  if (!isTile.value) return null
  if (isCztsTile.value) {
    return {
      uri: props.row!.路径 as string,
      fileName: props.row!.文件 as string,
    }
  }
  return {
    z: Number(props.row!.z),
    x: Number(props.row!.x),
    y: Number(props.row!.y),
  }
})

async function handleSaveTile() {
  if (!tileCoords.value) return
  if (isCztsTile.value) {
    // czts：按 uri 保存
    const { uri, fileName } = tileCoords.value as { uri: string, fileName: string }
    const destPath = await window.electronAPI.saveFile(fileName)
    if (!destPath) return
    const ok = await saveTileByUri(props.cztrPath, uri, destPath)
    if (ok) {
      message.success(`已保存: ${destPath}`)
    } else {
      message.error('保存失败')
    }
    return
  }
  // cztr：按 z/x/y 保存
  const { z, x, y } = tileCoords.value as { z: number, x: number, y: number }
  const defaultName = `tile-${z}-${x}-${y}.terrain`
  const destPath = await window.electronAPI.saveFile(defaultName)
  if (!destPath) return
  const ok = await saveTile(props.cztrPath, z, x, y, destPath)
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
