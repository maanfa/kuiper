<template>
  <div class="log-output">
    <div class="log-header">
      <span class="log-header-title">日志</span>
      <div class="log-header-actions">
        <NTooltip trigger="hover">
          <template #trigger>
            <NButton
              size="tiny"
              quaternary
              :disabled="lines.length === 0"
              @click="exportLog"
            >
              <template #icon>
                <NIcon :component="DownloadOutline" />
              </template>
            </NButton>
          </template>
          导出日志
        </NTooltip>
        <NTooltip trigger="hover">
          <template #trigger>
            <NButton
              size="tiny"
              quaternary
              @click="clear"
            >
              <template #icon>
                <NIcon :component="TrashOutline" />
              </template>
            </NButton>
          </template>
          清除日志
        </NTooltip>
      </div>
    </div>
    <NScrollbar ref="scrollRef" trigger="none">
      <div class="log-lines">
        <div
          v-for="(line, idx) in lines"
          :key="idx"
          class="log-line"
          :class="'log-' + line.level"
        >
          <span class="log-time">{{ formatTimestamp(line.timestamp) }}</span>
          <span class="log-level">[{{ line.level.toUpperCase() }}]</span>
          <span class="log-msg">{{ line.message }}</span>
        </div>
        <div v-if="lines.length === 0" class="log-empty">等待任务日志...</div>
      </div>
    </NScrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { NScrollbar, NButton, NIcon, NTooltip } from 'naive-ui'
import { TrashOutline, DownloadOutline } from '@vicons/ionicons5'
import { formatTimestamp } from '../../shared/time-utils'

interface LogLine {
  level: string
  message: string
  timestamp: number
}

const lines = ref<LogLine[]>([])
const scrollRef = ref<InstanceType<typeof NScrollbar> | null>(null)

function addLog(level: string, message: string, timestamp?: number): void {
  lines.value.push({
    level,
    message,
    timestamp: timestamp ?? Date.now(),
  })
  nextTick(() => {
    scrollRef.value?.scrollTo({ top: 999999, behavior: 'instant' })
  })
}

function clear(): void {
  lines.value = []
}

async function exportLog(): Promise<void> {
  if (lines.value.length === 0) return
  const text = lines.value
    .map((l) => `[${formatTimestamp(l.timestamp)}] [${l.level.toUpperCase()}] ${l.message}`)
    .join('\n')
  const ok = await window.electronAPI.saveText(text, `log_${Date.now()}.txt`)
  if (!ok) {
    // user cancelled dialog
  }
}

defineExpose({ addLog, clear })
</script>

<style scoped>
.log-output {
  height: 100%;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 12px;
  background: #252525;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.log-header-title {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.log-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.log-header :deep(.n-button) {
  color: #888;
}

.log-header :deep(.n-button:hover) {
  color: #e57373;
}

.log-lines {
  padding: 8px 12px;
  font-family: 'Maple Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  min-height: 100%;
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.log-time {
  color: #888;
  margin-right: 8px;
}

.log-level {
  margin-right: 8px;
  font-weight: 600;
}

.log-info .log-level { color: #4fc3f7; }
.log-warn .log-level { color: #ffb74d; }
.log-error .log-level { color: #e57373; }
.log-debug .log-level { color: #81c784; }

.log-info .log-msg { color: #d4d4d4; }
.log-warn .log-msg { color: #ffb74d; }
.log-error .log-msg { color: #e57373; }
.log-debug .log-msg { color: #81c784; }

.log-empty {
  color: #666;
  padding: 16px;
}
</style>
