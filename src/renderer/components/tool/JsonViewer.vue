<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NIcon } from 'naive-ui'
import { CopyOutline, DownloadOutline } from '@vicons/ionicons5'
import { JsonViewer as JsonViewerComponent } from 'vue3-json-viewer'
import { useUiStore } from '../../stores/ui'
import 'vue3-json-viewer/dist/vue3-json-viewer.css'

const props = defineProps<{
  data: unknown
  downloadName?: string
}>()

const uiStore = useUiStore()

const isEmpty = computed(() => {
  return props.data === null || props.data === undefined || (typeof props.data === 'object' && Object.keys(props.data as object).length === 0)
})

const downloadName = computed(() => {
  return props.downloadName || 'data.json'
})

function handleCopyAll() {
  try {
    const text = JSON.stringify(props.data, null, 2)
    navigator.clipboard.writeText(text).then(() => {
      uiStore.flashStatusText('✓ 已复制 JSON')
    })
  } catch {
    // ignore
  }
}

function handleDownload() {
  try {
    const text = JSON.stringify(props.data, null, 2)
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadName.value
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

function handleValueClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.classList.contains('jv-item')) return
  const text = target.textContent || ''
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    uiStore.flashStatusText('✓ 已复制')
  })
}
</script>

<template>
  <div class="json-viewer">
    <div class="json-toolbar">
      <span class="json-title">Inspect</span>
      <div class="json-actions">
        <NButton
          quaternary
          circle
          size="tiny"
          :disabled="!data"
          @click="handleCopyAll"
        >
          <template #icon>
            <NIcon size="16" :component="CopyOutline" />
          </template>
        </NButton>
        <NButton
          quaternary
          circle
          size="tiny"
          :disabled="!data"
          @click="handleDownload"
        >
          <template #icon>
            <NIcon size="16" :component="DownloadOutline" />
          </template>
        </NButton>
      </div>
    </div>
    <div ref="containerRef" class="json-body" @click="handleValueClick">
      <div v-if="!data" class="json-empty">右键一方天地，左看满屏数据</div>
      <div v-else-if="isEmpty" class="json-empty">此行空空如也</div>
      <JsonViewerComponent
        v-else
        :value="data"
        :expand-depth="1"
        theme="light"
        class="json-tree"
      />
    </div>
  </div>
</template>

<style scoped>
.json-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.json-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.json-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.json-actions {
  display: flex;
  gap: 4px;
}

.json-body {
  flex: 1;
  overflow: auto;
  padding: 8px 12px;
}

.json-body :deep(.jv-container) {
  font-family: 'Maple Mono NF CN', monospace;
  font-size: 13px;
  position: relative;
}

.json-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #ccc;
  font-size: 13px;
}
</style>
