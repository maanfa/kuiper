<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import {
  NButton,
  NIcon,
  NTag,
  NCard,
  NSpin,
  NPopconfirm,
  NTooltip,
} from 'naive-ui'
import {
  ServerOutline,
  StopOutline,
  TrashOutline,
  InformationCircleOutline,
} from '@vicons/ionicons5'
import ToolHeader from '../components/tool/ToolHeader.vue'
import { useUiStore } from '../stores/ui'
import { useTaskCenter } from '../composables/useTaskCenter'

const ui = useUiStore()
const {
  serverRuntime,
  tasks,
  startPolling,
  stopPolling,
  stopStaticServer,
  stopStaticFileServer,
  cancelTask,
} = useTaskCenter()

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

const taskTypeLabel: Record<string, string> = {
  'pack': '地形打包',
  'unpack': '地形解包',
  'tileset-pack': '3DTiles打包',
  'tileset-unpack': '3DTiles解包',
  'terrain-gen': '地形生成',
}

async function handleStopStaticServer() {
  const result = await stopStaticServer()
  ui.flashStatusText('静态托管服务已停止')
}

async function handleStopStaticFileServer() {
  const result = await stopStaticFileServer()
  ui.flashStatusText('静态文件服务已停止')
}

async function handleCancelTask(taskId: string) {
  await cancelTask(taskId)
  ui.flashStatusText('任务已取消')
}
</script>

<template>
  <div class="task-center-view">
    <ToolHeader>
      <template #title>任务中心</template>
    </ToolHeader>

    <div class="task-center-body">
      <div class="task-center-cards">
        <NCard title="服务运行状态" size="small" class="status-card">
          <div class="server-item">
            <div class="server-item-left">
              <NIcon size="18" :component="ServerOutline" />
              <span class="server-label">静态托管服务</span>
              <NTag
                :type="serverRuntime.staticServerRunning ? 'success' : 'default'"
                size="small"
                :bordered="false"
              >
                {{ serverRuntime.staticServerRunning ? '运行中' : '已停止' }}
              </NTag>
            </div>
            <NPopconfirm
              v-if="serverRuntime.staticServerRunning"
              @positive-click="handleStopStaticServer"
            >
              <template #trigger>
                <NButton size="tiny" type="error" quaternary>
                  <template #icon>
                    <NIcon size="14" :component="StopOutline" />
                  </template>
                  停止
                </NButton>
              </template>
              确认停止静态托管服务？
            </NPopconfirm>
          </div>

          <div class="server-item">
            <div class="server-item-left">
              <NIcon size="18" :component="ServerOutline" />
              <span class="server-label">静态文件服务</span>
              <NTag
                :type="serverRuntime.staticFileServerRunning ? 'success' : 'default'"
                size="small"
                :bordered="false"
              >
                {{ serverRuntime.staticFileServerRunning ? '运行中' : '已停止' }}
              </NTag>
            </div>
            <NPopconfirm
              v-if="serverRuntime.staticFileServerRunning"
              @positive-click="handleStopStaticFileServer"
            >
              <template #trigger>
                <NButton size="tiny" type="error" quaternary>
                  <template #icon>
                    <NIcon size="14" :component="StopOutline" />
                  </template>
                  停止
                </NButton>
              </template>
              确认停止静态文件服务？
            </NPopconfirm>
          </div>
        </NCard>

        <NCard title="后台任务" size="small" class="status-card">
          <template v-if="tasks.length === 0">
            <div class="empty-state">
              <NIcon size="32" :component="InformationCircleOutline" color="#ccc" />
              <span class="empty-text">暂无运行中的任务</span>
            </div>
          </template>
          <template v-else>
            <div v-for="t in tasks" :key="t.taskId" class="task-item">
              <div class="task-item-left">
                <NTag type="info" size="small" :bordered="false">
                  {{ taskTypeLabel[t.type] || t.type }}
                </NTag>
                <span class="task-label">{{ t.label }}</span>
              </div>
              <NPopconfirm @positive-click="handleCancelTask(t.taskId)">
                <template #trigger>
                  <NButton size="tiny" type="error" quaternary>
                    <template #icon>
                      <NIcon size="14" :component="TrashOutline" />
                    </template>
                    取消
                  </NButton>
                </template>
                确认取消该任务？
              </NPopconfirm>
            </div>
          </template>
        </NCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-center-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.task-center-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
}

.task-center-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
  margin: 0 auto;
}

.status-card {
  border-radius: 8px;
}

.server-item,
.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.server-item:last-child,
.task-item:last-child {
  border-bottom: none;
}

.server-item-left,
.task-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.server-label {
  font-size: 14px;
  color: #333;
}

.task-label {
  font-size: 13px;
  color: #666;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
}

.empty-text {
  font-size: 13px;
  color: #ccc;
}
</style>
