<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NTabs,
  NTabPane,
  NButton,
  NInputNumber,
  NProgress,
} from 'naive-ui'
import ToolHeader from '../components/tool/ToolHeader.vue'
import VerticalSplit from '../components/layout/VerticalSplit.vue'
import LogOutput from '../components/tool/LogOutput.vue'
import PackForm from '../components/tool/PackForm.vue'
import UnpackForm from '../components/tool/UnpackForm.vue'
import ConfirmTaskModal from '../components/tool/ConfirmTaskModal.vue'

const logRef = ref<InstanceType<typeof LogOutput> | null>(null)
const running = ref(false)
const progressCurrent = ref(0)
const progressTotal = ref(1)
const progressStatus = ref<'default' | 'success' | 'error'>('default')
const lastProgress = ref(false)
const workerCount = ref(3)
const showConfirm = ref(false)
const pendingType = ref<'pack' | 'unpack'>('pack')
const pendingPack = ref<PackParams | null>(null)
const pendingUnpack = ref<(UnpackParams & { clearOutput: boolean }) | null>(null)

let currentTaskId: string | null = null
let unlog: (() => void) | null = null
let unprogress: (() => void) | null = null
let uncomplete: (() => void) | null = null

const progressPercent = computed(() => {
  if (progressTotal.value === 0) return 0
  return Math.round((progressCurrent.value / progressTotal.value) * 100)
})

const progressText = computed(() => {
  if (progressStatus.value === 'success') return '完成'
  if (progressStatus.value === 'error') return '失败'
  return `已处理: ${progressCurrent.value} / ${progressTotal.value}`
})

onMounted(async () => {
  try {
    const cfg = await window.electronAPI.getConfig()
    workerCount.value = cfg.task.workerCount
  } catch {
    // ignore
  }
})

onUnmounted(() => {
  unlog?.()
  unprogress?.()
  uncomplete?.()
})

function onWorkerCountChange(val: number | null): void {
  if (val == null) return
  workerCount.value = val
  window.electronAPI.getConfig().then((cfg) => {
    cfg.task.workerCount = val
    window.electronAPI.saveConfig(cfg)
  })
}

function addLog(level: string, message: string, timestamp?: number): void {
  logRef.value?.addLog(level, message, timestamp)
}

function clearLog(): void {
  logRef.value?.clear()
}

function onPackStart(params: PackParams & { workerCount: number, batchSize: number }): void {
  pendingType.value = 'pack'
  pendingPack.value = params
  pendingUnpack.value = null
  showConfirm.value = true
}

function onUnpackStart(params: UnpackParams & { workerCount: number, clearOutput: boolean, batchSize: number }): void {
  pendingType.value = 'unpack'
  pendingUnpack.value = params
  pendingPack.value = null
  showConfirm.value = true
}

function handleConfirm(): void {
  showConfirm.value = false
  if (pendingPack.value) {
    startTask({ type: 'pack', ...pendingPack.value } as TaskStartConfig)
  } else if (pendingUnpack.value) {
    startTask({ type: 'unpack', ...pendingUnpack.value } as TaskStartConfig)
  }
}

async function startTask(config: TaskStartConfig): Promise<void> {
  running.value = true
  progressCurrent.value = 0
  progressTotal.value = 1
  progressStatus.value = 'default'
  lastProgress.value = true

  unlog = window.electronAPI.onTaskLog((msg) => {
    addLog(msg.level, msg.message, msg.timestamp)
  })

  unprogress = window.electronAPI.onTaskProgress((p) => {
    if (p.taskId === currentTaskId) {
      progressCurrent.value = p.current
      progressTotal.value = p.total
    }
  })

  uncomplete = window.electronAPI.onTaskComplete((result) => {
    if (result.taskId === currentTaskId) {
      running.value = false
      progressStatus.value = result.success ? 'success' : 'error'
      if (result.error) {
        addLog('error', `任务失败: ${result.error}`)
      }
      setTimeout(() => {
        lastProgress.value = false
      }, 3000)
      unlog?.()
      unprogress?.()
      uncomplete?.()
      currentTaskId = null
    }
  })

  try {
    currentTaskId = await window.electronAPI.taskStart(config)
  } catch (err) {
    running.value = false
    lastProgress.value = false
    addLog('error', `启动任务失败: ${err}`)
  }
}

async function cancelTask(): Promise<void> {
  if (!currentTaskId) return
  try {
    await window.electronAPI.taskCancel(currentTaskId)
    addLog('warn', '任务已取消')
  } catch (err) {
    addLog('error', `取消任务失败: ${err}`)
  }
}
</script>

<template>
  <div class="converter-view">
    <ToolHeader>
      <template #title>地形切片转换器</template>
      <template #actions>
        <div class="worker-count-row">
          <span class="worker-label">并行数</span>
          <NInputNumber
            :min="1"
            :max="50"
            :value="workerCount"
            :disabled="running"
            size="small"
            :style="{ width: '72px' }"
            @update:value="onWorkerCountChange"
          />
        </div>
        <NButton
          v-if="running"
          size="small"
          type="error"
          quaternary
          @click="cancelTask"
        >
          取消
        </NButton>
      </template>
    </ToolHeader>

    <div v-if="running || lastProgress" class="progress-area">
      <NProgress
        :percentage="progressPercent"
        :status="progressStatus === 'error' ? 'error' : progressStatus === 'success' ? 'success' : 'default'"
        :height="4"
        :border-radius="0"
      />
      <span class="progress-text">{{ progressText }}</span>
    </div>

    <VerticalSplit
      :initial-ratio="0.45"
      :min-left-width="300"
      :min-right-width="600"
      class="converter-body"
    >
      <template #left>
        <div class="left-panel">
          <NTabs type="bar" :default-value="'pack'">
            <NTabPane name="pack" tab="切片转单文件">
              <div class="tab-content">
                <PackForm
                  :disabled="running"
                  :running="running"
                  @pack-start="onPackStart"
                />
              </div>
            </NTabPane>
            <NTabPane name="unpack" tab="单文件解包切片">
              <div class="tab-content">
                <UnpackForm
                  :disabled="running"
                  :running="running"
                  @unpack-start="onUnpackStart"
                />
              </div>
            </NTabPane>
          </NTabs>
        </div>
      </template>
      <template #right>
        <LogOutput ref="logRef" />
      </template>
    </VerticalSplit>

    <ConfirmTaskModal
      :show="showConfirm"
      :type="pendingType"
      :source-dir="pendingPack?.sourceDir"
      :output-file="pendingPack?.outputFile"
      :source-file="pendingUnpack?.sourceFile"
      :output-dir="pendingUnpack?.outputDir"
      :worker-count="workerCount"
      @close="showConfirm = false"
      @confirm="handleConfirm"
    />
  </div>
</template>

<style scoped>
.converter-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.converter-body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  padding: 12px;
  background: #f5f5f5;
}

.left-panel {
  height: 100%;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  padding: 16px;
}

.tab-content {
  height: 100%;
  padding: 16px 0 0;
  overflow: hidden;
  background: #fff;
}

.progress-area {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.progress-area :deep(.n-progress) {
  flex: 1;
}

.progress-text {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
}

.worker-count-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.worker-label {
  font-size: 12px;
  color: #666;
}
</style>
