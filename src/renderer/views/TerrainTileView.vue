<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NButton,
  NProgress,
  NTooltip,
} from 'naive-ui'
import { CloseOutline } from '@vicons/ionicons5'
import ToolHeader from '../components/tool/ToolHeader.vue'
import VerticalSplit from '../components/layout/VerticalSplit.vue'
import LogOutput from '../components/tool/LogOutput.vue'
import TerrainGenSetup from '../components/tool/TerrainGenSetup.vue'
import TerrainGenForm from '../components/tool/TerrainGenForm.vue'
import { useUiStore } from '../stores/ui'

const uiStore = useUiStore()

// 环境状态
const jdkReady = ref(false)
const jarReady = ref(false)
const jdkPath = ref('')
const jarPath = ref('')
const jdkError = ref('')
const jarError = ref('')
const javaVersion = ref('')
const checkingEnv = ref(true)

// 任务状态
const logRef = ref<InstanceType<typeof LogOutput> | null>(null)
const running = ref(false)
const progressCurrent = ref(0)
const progressTotal = ref(0)
const progressStatus = ref<'default' | 'success' | 'error'>('default')
const lastProgress = ref(false)

let currentTaskId: string | null = null
let unlog: (() => void) | null = null
let unprogress: (() => void) | null = null
let uncomplete: (() => void) | null = null

const progressPercent = computed(() => {
  if (progressTotal.value === 0) return 0
  return Math.round((progressCurrent.value / progressTotal.value) * 100)
})

const progressText = computed(() => {
  if (progressStatus.value === 'success') return '生成完成'
  if (progressStatus.value === 'error') return '生成失败'
  if (progressTotal.value > 0) return `已处理: ${progressCurrent.value} / ${progressTotal.value}`
  return '准备中...'
})

onMounted(async () => {
  await checkEnv()
})

onUnmounted(() => {
  unlog?.()
  unprogress?.()
  uncomplete?.()
})

async function checkEnv(): Promise<void> {
  checkingEnv.value = true
  try {
    const result = await window.electronAPI.checkJava()
    jdkReady.value = result.jdkReady
    jarReady.value = result.jarReady
    jdkPath.value = result.jdkPath || ''
    jarPath.value = result.jarPath || ''
    jdkError.value = result.jdkError
    jarError.value = result.jarError
    javaVersion.value = result.javaVersion
  } catch (err) {
    jdkError.value = `环境检测失败: ${err}`
  } finally {
    checkingEnv.value = false
  }
}

function navigateSettings(): void {
  uiStore.showSettings = true
}

function addLog(level: string, message: string, timestamp?: number): void {
  logRef.value?.addLog(level, message, timestamp)
}

async function onGenStart(params: TerrainGenParams): Promise<void> {
  running.value = true
  progressCurrent.value = 0
  progressTotal.value = 0
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
      }, 5000)
      unlog?.()
      unprogress?.()
      uncomplete?.()
      currentTaskId = null
    }
  })

  try {
    currentTaskId = await window.electronAPI.taskStart({
      type: 'terrain-gen',
      tifDir: params.tifDir,
      outputDir: params.outputDir,
      minZoom: params.minZoom,
      maxZoom: params.maxZoom,
      jdkPath: params.jdkPath,
      jarPath: params.jarPath,
      advanced: params.advanced,
    })
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

const envReady = computed(() => jdkReady.value && jarReady.value)
</script>

<template>
  <div class="generator-view">
    <ToolHeader>
      <template #title>地形切片生成器</template>
      <template #actions>
        <NButton
          v-if="running"
          size="small"
          type="error"
          quaternary
          @click="cancelTask"
        >
          <template #icon>
            <CloseOutline />
          </template>
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
      class="generator-body"
    >
      <template #left>
        <div class="left-panel">
          <div v-if="checkingEnv" class="loading-state">
            <span>正在检测运行环境...</span>
          </div>
          <TerrainGenSetup
            v-else-if="!envReady"
            :jdk-ready="jdkReady"
            :jar-ready="jarReady"
            :jdk-path="jdkPath"
            :jar-path="jarPath"
            :jdk-error="jdkError"
            :jar-error="jarError"
            :java-version="javaVersion"
            @navigate-settings="navigateSettings"
            @refresh="checkEnv"
          />
          <TerrainGenForm
            v-else
            :disabled="running"
            :running="running"
            @gen-start="onGenStart"
          />
        </div>
      </template>
      <template #right>
        <LogOutput ref="logRef" />
      </template>
    </VerticalSplit>
  </div>
</template>

<style scoped>
.generator-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.generator-body {
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

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 13px;
  color: #999;
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
</style>
