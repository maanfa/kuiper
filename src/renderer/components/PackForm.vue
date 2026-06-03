<template>
  <div class="pack-form">
    <div class="form-fields">
      <NForm label-placement="top" size="medium">
        <NFormItem label="输入目录" required>
          <div class="path-row">
            <NInput
              :value="sourceDir"
              placeholder="选择包含 layer.json 的地形切片目录"
              readonly
            />
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton :disabled="disabled || !sourceDir" quaternary circle @click="openDir(sourceDir)">
                  <template #icon><NIcon :component="OpenOutline" /></template>
                </NButton>
              </template>
              打开此目录
            </NTooltip>
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton :disabled="disabled" quaternary circle @click="selectDir">
                  <template #icon><NIcon :component="FolderOpenOutline" /></template>
                </NButton>
              </template>
              选择目录
            </NTooltip>
          </div>
        </NFormItem>
        <NFormItem label="输出文件" required>
          <div class="path-row">
            <NInput
              :value="outputFile"
              placeholder="选择 .cztr 文件保存位置"
              readonly
            />
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton :disabled="disabled || !outputFile" quaternary circle @click="openDirParent(outputFile)">
                  <template #icon><NIcon :component="OpenOutline" /></template>
                </NButton>
              </template>
              打开所在目录
            </NTooltip>
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton :disabled="disabled" quaternary circle @click="selectSave">
                  <template #icon><NIcon :component="SaveOutline" /></template>
                </NButton>
              </template>
              选择保存位置
            </NTooltip>
          </div>
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

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import {
  NForm,
  NFormItem,
  NInput,
  NButton,
  NIcon,
  NTooltip,
  NInputNumber,
  NAlert,
} from 'naive-ui'
import { FolderOpenOutline, SaveOutline, OpenOutline, ChevronDownOutline } from '@vicons/ionicons5'

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

async function selectDir(): Promise<void> {
  const dir = await window.electronAPI.openDirectory()
  if (dir) {
    sourceDir.value = dir
    const name = dir.split(/[/\\]/).pop() || 'tiles'
    const parent = dir.replace(/[/\\][^/\\]*$/, '')
    outputFile.value = parent ? `${parent}\\${name}.cztr` : `${name}.cztr`
  }
}

async function selectSave(): Promise<void> {
  const defaultName = sourceDir.value
    ? `${sourceDir.value.split(/[/\\]/).pop() || 'tiles'}.cztr`
    : 'tiles.cztr'
  const path = await window.electronAPI.saveFile(defaultName)
  if (path) outputFile.value = path
}

function openDir(dir: string): void {
  if (dir) window.electronAPI.openPath(dir)
}

function openDirParent(filePath: string): void {
  const parent = filePath.replace(/[/\\][^/\\]*$/, '')
  if (parent) window.electronAPI.openPath(parent)
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

.path-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.path-row :deep(.n-input) {
  flex: 1;
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
