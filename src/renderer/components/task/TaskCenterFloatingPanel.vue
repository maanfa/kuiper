<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NIcon,
  NTag,
  NPopconfirm,
} from 'naive-ui'
import {
  CloseOutline,
  ServerOutline,
  StopOutline,
  TrashOutline,
  InformationCircleOutline,
} from '@vicons/ionicons5'
import { useUiStore } from '../../stores/ui'
import { useTaskCenter } from '../../composables/useTaskCenter'

const ui = useUiStore()
const router = useRouter()
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

function close() {
  ui.showTaskCenterFloat = false
}

async function handleStopStaticServer() {
  await stopStaticServer()
  ui.flashStatusText('静态托管服务已停止')
}

async function handleStopStaticFileServer() {
  await stopStaticFileServer()
  ui.flashStatusText('静态文件服务已停止')
}

async function handleCancelTask(taskId: string) {
  await cancelTask(taskId)
  ui.flashStatusText('任务已取消')
}

function goFull() {
  ui.showTaskCenterFloat = false
  router.push('/task-center')
}
</script>

<template>
  <div class="task-center-float">
    <div class="float-header">
      <span class="float-title">任务中心</span>
      <div class="float-header-actions">
        <NButton size="tiny" quaternary @click="goFull">
          查看全部
        </NButton>
        <NButton size="tiny" quaternary @click="close">
          <template #icon>
            <NIcon size="14" :component="CloseOutline" />
          </template>
        </NButton>
      </div>
    </div>

    <div class="float-section">
      <div class="float-section-title">服务状态</div>
      <div class="float-server-item">
        <div class="float-item-left">
          <NIcon size="14" :component="ServerOutline" />
          <span class="float-item-label">静态托管</span>
        </div>
        <div class="float-item-right">
          <NTag
            :type="serverRuntime.staticServerRunning ? 'success' : 'default'"
            size="tiny"
            :bordered="false"
          >
            {{ serverRuntime.staticServerRunning ? '运行' : '停止' }}
          </NTag>
          <NPopconfirm
            v-if="serverRuntime.staticServerRunning"
            @positive-click="handleStopStaticServer"
          >
            <template #trigger>
              <NButton size="tiny" type="error" quaternary>
                <template #icon>
                  <NIcon size="12" :component="StopOutline" />
                </template>
              </NButton>
            </template>
            确认停止？
          </NPopconfirm>
        </div>
      </div>

      <div class="float-server-item">
        <div class="float-item-left">
          <NIcon size="14" :component="ServerOutline" />
          <span class="float-item-label">静态文件</span>
        </div>
        <div class="float-item-right">
          <NTag
            :type="serverRuntime.staticFileServerRunning ? 'success' : 'default'"
            size="tiny"
            :bordered="false"
          >
            {{ serverRuntime.staticFileServerRunning ? '运行' : '停止' }}
          </NTag>
          <NPopconfirm
            v-if="serverRuntime.staticFileServerRunning"
            @positive-click="handleStopStaticFileServer"
          >
            <template #trigger>
              <NButton size="tiny" type="error" quaternary>
                <template #icon>
                  <NIcon size="12" :component="StopOutline" />
                </template>
              </NButton>
            </template>
            确认停止？
          </NPopconfirm>
        </div>
      </div>
    </div>

    <div class="float-section">
      <div class="float-section-title">后台任务</div>
      <template v-if="tasks.length === 0">
        <div class="float-empty">
          <NIcon size="18" :component="InformationCircleOutline" color="#ccc" />
          <span>暂无运行中的任务</span>
        </div>
      </template>
      <template v-else>
        <div v-for="t in tasks" :key="t.taskId" class="float-task-item">
          <div class="float-item-left">
            <NTag type="info" size="tiny" :bordered="false">
              {{ taskTypeLabel[t.type] || t.type }}
            </NTag>
            <span class="float-item-label">{{ t.label }}</span>
          </div>
          <NPopconfirm @positive-click="handleCancelTask(t.taskId)">
            <template #trigger>
              <NButton size="tiny" type="error" quaternary>
                <template #icon>
                  <NIcon size="12" :component="TrashOutline" />
                </template>
              </NButton>
            </template>
            确认取消？
          </NPopconfirm>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.task-center-float {
  position: absolute;
  bottom: 44px;
  right: 16px;
  width: 340px;
  max-height: 400px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
}

.float-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.float-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.float-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.float-section {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.float-section:last-child {
  border-bottom: none;
}

.float-section-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.float-server-item,
.float-task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.float-item-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.float-item-label {
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.float-item-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.float-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  font-size: 12px;
  color: #ccc;
}
</style>
