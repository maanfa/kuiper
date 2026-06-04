<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import {
  NForm,
  NFormItem,
  NButton,
  NIcon,
  NInputNumber,
  NAlert,
} from 'naive-ui'
import { ChevronDownOutline } from '@vicons/ionicons5'
import PathInput from '../form/PathInput.vue'

const props = defineProps<{
  disabled?: boolean
  running?: boolean
}>()

const emit = defineEmits<{
  packStart: [params: PackParams & { workerCount: number, batchSize: number }]
}>()

const sourceDir = useStorage('pack-sourceDir', '')
const outputFile = useStorage('pack-outputFile', '')
const batchSize = useStorage('pack-batchSize', 400)
const showAdvanced = ref(false)

const canStart = computed(() => sourceDir.value && outputFile.value)
const isUncPath = computed(() => sourceDir.value.startsWith('\\\\') || sourceDir.value.startsWith('//') || outputFile.value.startsWith('\\\\') || outputFile.value.startsWith('//'))

const saveDefaultName = computed(() => {
  return sourceDir.value
    ? `${sourceDir.value.split(/[/\\]/).pop() || 'tiles'}.cztr`
    : 'tiles.cztr'
})

function handleSourceDirChange(dir: string) {
  const name = dir.split(/[/\\]/).pop() || 'tiles'
  const parent = dir.replace(/[/\\][^/\\]*$/, '')
  outputFile.value = parent ? `${parent}\\${name}.cztr` : `${name}.cztr`
}

async function startPack(): Promise<void> {
  const cfg = await window.electronAPI.getConfig()
  emit('packStart', {
    sourceDir: sourceDir.value,
    outputFile: outputFile.value,
    workerCount: cfg.task.workerCount,
    batchSize: batchSize.value,
  })
}
</script>

<template>
  <div class="pack-form">
    <div class="form-fields">
      <NForm label-placement="top" size="medium">
        <NFormItem label="输入目录" required>
          <PathInput
            v-model="sourceDir"
            placeholder="选择包含 layer.json 的地形切片目录"
            select-mode="dir"
            @update:model-value="handleSourceDirChange"
          />
        </NFormItem>
        <NFormItem label="输出文件" required>
          <PathInput
            v-model="outputFile"
            placeholder="选择 .cztr 文件保存位置"
            open-mode="parent"
            select-mode="save"
            :save-default-name="saveDefaultName"
          />
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
        @click="startPack"
      >
        {{ running ? '处理中...' : '提交' }}
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.pack-form {
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
