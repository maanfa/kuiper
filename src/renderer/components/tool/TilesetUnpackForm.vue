<script setup lang="ts">
import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { NForm, NFormItem, NButton, NCheckbox, NAlert } from 'naive-ui'
import PathInput from '../form/PathInput.vue'
import { useUiStore } from '../../stores/ui'

const uiStore = useUiStore()

const props = defineProps<{
  disabled?: boolean
  running?: boolean
}>()

const emit = defineEmits<{
  tilesetUnpackStart: [params: TilesetUnpackParams & { workerCount: number, batchSize: number }]
}>()

const sourceFile = useStorage('tilesetUnpack-sourceFile', '')
const outputDir = useStorage('tilesetUnpack-outputDir', '')
const clearOutput = useStorage('tilesetUnpack-clearOutput', false)
const batchSize = useStorage('tilesetUnpack-batchSize', 400)

const cztsFilter = [{ name: 'CZTS 3DTiles 包', extensions: ['czts'] as string[] }]

const canStart = computed(() => sourceFile.value && outputDir.value)

const isUncPath = computed(() =>
  sourceFile.value.startsWith('\\\\') || sourceFile.value.startsWith('//') ||
  outputDir.value.startsWith('\\\\') || outputDir.value.startsWith('//')
)

function handleSourceFileChange(path: string) {
  outputDir.value = path.replace(/\.czts$/, '_extracted')
}

async function startUnpack(): Promise<void> {
  const cfg = await window.electronAPI.getConfig()
  emit('tilesetUnpackStart', {
    sourceFile: sourceFile.value,
    outputDir: outputDir.value,
    workerCount: cfg.task.workerCount,
    clearOutput: clearOutput.value,
    batchSize: batchSize.value,
  })
}
</script>

<template>
  <div class="unpack-form">
    <div class="form-fields">
      <NForm label-placement="top" size="medium">
        <NFormItem label="源文件" required>
          <PathInput
            v-model="sourceFile"
            placeholder="选择 .czts 文件"
            open-mode="parent"
            select-mode="file"
            :select-filters="cztsFilter"
            @update:model-value="handleSourceFileChange"
            @focus="(v: string) => uiStore.setStatusText(v)"
            @blur="uiStore.clearStatusText()"
          />
        </NFormItem>
        <NFormItem label="输出目录" required>
          <PathInput
            v-model="outputDir"
            placeholder="选择 3DTiles 还原的目标目录"
            select-mode="dir"
            @focus="(v: string) => uiStore.setStatusText(v)"
            @blur="uiStore.clearStatusText()"
          />
        </NFormItem>
        <NFormItem>
          <NCheckbox v-model:checked="clearOutput" :disabled="disabled">
            每次执行前清理目标文件夹
          </NCheckbox>
        </NFormItem>
        <NAlert
          v-if="isUncPath"
          type="warning"
          title="检测到网络路径"
          :bordered="false"
          class="unc-warning"
        >
          输入或输出位于 SMB/UNC 网络路径。网络延迟可能引起界面短暂卡顿。
        </NAlert>
      </NForm>
    </div>
    <div class="form-submit">
      <NButton
        type="primary"
        :loading="running"
        :disabled="disabled || !canStart"
        @click="startUnpack"
      >
        {{ running ? '处理中...' : '提交' }}
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.unpack-form {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.form-fields {
  flex: 1;
  overflow-y: auto;
}

.form-submit {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  flex-shrink: 0;
}

.unc-warning {
  margin-bottom: 12px;
}
</style>
