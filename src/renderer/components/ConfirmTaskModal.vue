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

<script setup lang="ts">
import { computed } from 'vue'
import { NModal, NCard, NButton } from 'naive-ui'

const props = defineProps<{
  show: boolean
  type: 'pack' | 'unpack'
  sourceDir?: string
  outputFile?: string
  sourceFile?: string
  outputDir?: string
  workerCount: number
}>()

defineEmits<{
  close: []
  confirm: []
}>()

const typeLabel = computed(() => (props.type === 'pack' ? '切片转单文件' : '单文件解包切片'))
const inputPath = computed(() => (props.type === 'pack' ? props.sourceDir : props.sourceFile) ?? '')
const outputPath = computed(() => (props.type === 'pack' ? props.outputFile : props.outputDir) ?? '')
</script>

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
