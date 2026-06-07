<script setup lang="ts">
import { computed } from 'vue'
import { NModal, NCard, NButton } from 'naive-ui'

const props = defineProps<{
  show: boolean
  type: 'pack' | 'unpack' | 'tileset-pack' | 'tileset-unpack'
  sourceDir?: string
  outputFile?: string
  sourceFile?: string
  outputDir?: string
  tilesetJsonPath?: string
  workerCount: number
}>()

defineEmits<{
  close: []
  confirm: []
}>()

const typeLabel = computed(() => {
  switch (props.type) {
    case 'pack': return '切片转单文件'
    case 'unpack': return '单文件解包切片'
    case 'tileset-pack': return '3DTiles 数据集转单文件'
    case 'tileset-unpack': return '单文件还原 3DTiles'
  }
})
const inputPath = computed(() => {
  switch (props.type) {
    case 'pack': return props.sourceDir
    case 'unpack': return props.sourceFile
    case 'tileset-pack': return props.tilesetJsonPath
    case 'tileset-unpack': return props.sourceFile
  }
  return ''
})
const outputPath = computed(() => {
  switch (props.type) {
    case 'pack': return props.outputFile
    case 'unpack': return props.outputDir
    case 'tileset-pack': return props.outputFile
    case 'tileset-unpack': return props.outputDir
  }
  return ''
})
</script>

<template>
  <NModal :show="show" :mask-closable="false" @update:show="$emit('close')">
    <NCard
      title="确认任务"
      style="width: 420px"
      :bordered="false"
      role="dialog"
    >
      <div class="confirm-body">
        <div class="info-row">
          <span class="info-label">类型</span>
          <span class="info-value">{{ typeLabel }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">输入</span>
          <span class="info-value">{{ inputPath }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">输出</span>
          <span class="info-value">{{ outputPath }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">并行数</span>
          <span class="info-value">{{ workerCount }}</span>
        </div>
      </div>
      <template #footer>
        <div class="confirm-footer">
          <NButton @click="$emit('close')">取消</NButton>
          <NButton type="primary" @click="$emit('confirm')">提交</NButton>
        </div>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.confirm-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.info-label {
  flex-shrink: 0;
  width: 56px;
  font-size: 13px;
  color: #888;
}

.info-value {
  font-size: 13px;
  color: #333;
  word-break: break-all;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
