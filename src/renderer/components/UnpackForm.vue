<template>
  <div class="unpack-form">
    <div class="form-fields">
      <NForm label-placement="top" size="medium">
        <NFormItem label="源文件" required>
          <PathInput
            v-model="sourceFile"
            placeholder="选择 .cztr 文件"
            open-mode="parent"
            select-mode="file"
            :select-filters="cztrFilter"
            @update:model-value="handleSourceFileChange"
          />
        </NFormItem>
        <NFormItem label="输出目录" required>
          <PathInput
            v-model="outputDir"
            placeholder="选择瓦片还原的目标目录"
            select-mode="dir"
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
          输入或输出位于 SMB/UNC 网络路径。网络延迟可能引起界面短暂卡顿——文件读取和数据库写入在后台线程异步执行，不影响操作，但素材扫描和最终文件复制需要等待网络响应。
        </NAlert>
        <div class="advanced-toggle" @click="showAdvanced = !showAdvanced">
          <span>高级参数</span>
          <NIcon :size="14" :style="{ transform: showAdvanced ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }">
            <ChevronDownOutline />
          </NIcon>
        </div>
        <template v-if="showAdvanced">
          <NFormItem label="每批数量">
            <NInputNumber
              v-model:value="batchSize"
              :min="10"
              :max="500"
              :step="10"
              :disabled="disabled"
              :style="{ width: '100%' }"
            />
          </NFormItem>
        </template>
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

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import {
  NForm,
  NFormItem,
  NButton,
  NIcon,
  NCheckbox,
  NInputNumber,
  NAlert,
} from 'naive-ui'
import { ChevronDownOutline } from '@vicons/ionicons5'
import PathInput from './PathInput.vue'

const props = defineProps<{
  disabled?: boolean
  running?: boolean
}>()

const emit = defineEmits<{
  unpackStart: [params: UnpackParams & { workerCount: number, clearOutput: boolean, batchSize: number }]
}>()

const sourceFile = useStorage('unpack-sourceFile', '')
const outputDir = useStorage('unpack-outputDir', '')
const clearOutput = useStorage('unpack-clearOutput', false)
const batchSize = useStorage('unpack-batchSize', 400)
const showAdvanced = ref(false)

const canStart = computed(() => sourceFile.value && outputDir.value)
const isUncPath = computed(() => sourceFile.value.startsWith('\\\\') || sourceFile.value.startsWith('//') || outputDir.value.startsWith('\\\\') || outputDir.value.startsWith('//'))

const cztrFilter = [{ name: 'CZTR 地形包', extensions: ['cztr'] as string[] }]

function handleSourceFileChange(path: string) {
  outputDir.value = path.replace(/\.cztr$/, '_extracted')
}

async function startUnpack(): Promise<void> {
  const cfg = await window.electronAPI.getConfig()
  emit('unpackStart', {
    sourceFile: sourceFile.value,
    outputDir: outputDir.value,
    workerCount: cfg.task.workerCount,
    clearOutput: clearOutput.value,
    batchSize: batchSize.value,
  })
}
</script>

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

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  font-size: 12px;
  color: #888;
  cursor: pointer;
  user-select: none;
}

.advanced-toggle:hover {
  color: #555;
}

.unc-warning {
  margin-bottom: 12px;
}
</style>
