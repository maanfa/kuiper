<template>
  <div class="unpack-form">
    <div class="form-fields">
      <NForm label-placement="top" size="medium">
        <NFormItem label="源文件" required>
          <div class="path-row">
            <NInput
              :value="sourceFile"
              placeholder="选择 .cztr 文件"
              readonly
            />
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton :disabled="disabled || !sourceFile" quaternary circle @click="openDirParent(sourceFile)">
                  <template #icon><NIcon :component="OpenOutline" /></template>
                </NButton>
              </template>
              打开所在目录
            </NTooltip>
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton :disabled="disabled" quaternary circle @click="selectFile">
                  <template #icon><NIcon :component="DocumentOutline" /></template>
                </NButton>
              </template>
              选择文件
            </NTooltip>
          </div>
        </NFormItem>
        <NFormItem label="输出目录" required>
          <div class="path-row">
            <NInput
              :value="outputDir"
              placeholder="选择瓦片还原的目标目录"
              readonly
            />
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton :disabled="disabled || !outputDir" quaternary circle @click="openDir(outputDir)">
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
  NInput,
  NButton,
  NIcon,
  NTooltip,
  NCheckbox,
  NInputNumber,
  NAlert,
} from 'naive-ui'
import { FolderOpenOutline, DocumentOutline, OpenOutline, ChevronDownOutline } from '@vicons/ionicons5'

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

async function selectFile(): Promise<void> {
  const path = await window.electronAPI.openFile([
    { name: 'CZTR 地形包', extensions: ['cztr'] },
  ])
  if (path) {
    sourceFile.value = path
    outputDir.value = path.replace(/\.cztr$/, '_extracted')
  }
}

async function selectDir(): Promise<void> {
  const dir = await window.electronAPI.openDirectory()
  if (dir) outputDir.value = dir
}

function openDir(dir: string): void {
  if (dir) window.electronAPI.openPath(dir)
}

function openDirParent(filePath: string): void {
  const parent = filePath.replace(/[/\\][^/\\]*$/, '')
  if (parent) window.electronAPI.openPath(parent)
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
