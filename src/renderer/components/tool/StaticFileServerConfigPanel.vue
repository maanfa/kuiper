<script setup lang="ts">
import { ref, watch } from 'vue'
import { NInputNumber, NInput, NButton, NSwitch } from 'naive-ui'
import { FolderOpenOutline } from '@vicons/ionicons5'

const props = defineProps<{
  serverConfig: StaticFileServerConfig
  serverRunning: boolean
}>()

const emit = defineEmits<{
  'update:serverConfig': [config: StaticFileServerConfig]
  start: []
  stop: []
}>()

const localPort = ref(props.serverConfig.port)
const localPrefix = ref(props.serverConfig.prefix)
const localRootDir = ref(props.serverConfig.rootDir)
const localShowDirectoryListing = ref(props.serverConfig.showDirectoryListing)

watch(() => props.serverConfig, (cfg) => {
  localPort.value = cfg.port
  localPrefix.value = cfg.prefix
  localRootDir.value = cfg.rootDir
  localShowDirectoryListing.value = cfg.showDirectoryListing
}, { deep: true })

function sync() {
  emit('update:serverConfig', {
    port: localPort.value,
    prefix: localPrefix.value,
    rootDir: localRootDir.value,
    showDirectoryListing: localShowDirectoryListing.value,
  })
}

function onPortChange(v: number | null) {
  localPort.value = v ?? 9357
  sync()
}

function onPrefixChange(v: string) {
  localPrefix.value = v
  sync()
}

function onRootDirChange(v: string) {
  localRootDir.value = v
  sync()
}

function onShowDirectoryListingChange(v: boolean) {
  localShowDirectoryListing.value = v
  sync()
}

async function selectDirectory() {
  const dir = await window.electronAPI.openDirectory()
  if (dir) {
    localRootDir.value = dir
    sync()
  }
}

const hasRootDir = () => !!localRootDir.value
</script>

<template>
  <div class="config-panel">
    <div class="config-fields">
      <div class="config-row">
        <label class="config-label">端口</label>
        <NInputNumber
          :value="localPort"
          :min="1024"
          :max="65535"
          :disabled="serverRunning"
          class="config-input"
          @update:value="onPortChange"
        />
      </div>
      <div class="config-row">
        <label class="config-label">前缀路径</label>
        <NInput
          :value="localPrefix"
          :disabled="serverRunning"
          class="config-input"
          placeholder="/"
          @update:value="onPrefixChange"
        />
      </div>
      <div class="config-row">
        <label class="config-label">根目录</label>
        <div class="root-dir-row">
          <NInput
            :value="localRootDir"
            :disabled="serverRunning"
            class="config-input"
            placeholder="选择要托管的目录..."
            @update:value="onRootDirChange"
          />
          <NButton
            size="small"
            :disabled="serverRunning"
            @click="selectDirectory"
          >
            <template #icon>
              <FolderOpenOutline />
            </template>
            选择
          </NButton>
        </div>
      </div>
      <div class="config-row">
        <label class="config-label">目录浏览</label>
        <div class="switch-row">
          <NSwitch
            :value="localShowDirectoryListing"
            :disabled="serverRunning"
            @update:value="onShowDirectoryListingChange"
          />
          <span class="switch-hint">{{ localShowDirectoryListing ? '开启（类似 nginx autoindex）' : '关闭' }}</span>
        </div>
      </div>
    </div>

    <div class="dir-hint" v-if="localRootDir">
      <div class="dir-hint-label">托管目录</div>
      <div class="dir-hint-path" :title="localRootDir">{{ localRootDir }}</div>
    </div>
    <div class="dir-hint dir-hint-empty" v-else>
      请选择要托管的根目录
    </div>

    <div class="actions-section">
      <NButton
        v-if="serverRunning"
        type="error"
        block
        @click="$emit('stop')"
      >
        停止服务
      </NButton>
      <NButton
        v-else
        type="success"
        block
        :disabled="!hasRootDir()"
        @click="$emit('start')"
      >
        启动服务
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.config-fields {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-label {
  width: 80px;
  font-size: 13px;
  color: #555;
  flex-shrink: 0;
}

.config-input {
  flex: 1;
}

.root-dir-row {
  display: flex;
  gap: 8px;
  flex: 1;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-hint {
  font-size: 12px;
  color: #888;
}

.dir-hint {
  flex-shrink: 0;
  background: #f8faf8;
  border: 1px solid #e0e8e0;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 12px;
}

.dir-hint-empty {
  background: #fff;
  border: 1px dashed #e0e0e0;
  color: #bbb;
  font-size: 13px;
  text-align: center;
  padding: 20px 12px;
}

.dir-hint-label {
  font-size: 11px;
  color: #888;
  margin-bottom: 2px;
}

.dir-hint-path {
  font-size: 12px;
  color: #333;
  word-break: break-all;
}

.actions-section {
  flex-shrink: 0;
  margin-top: auto;
  padding-top: 16px;
}
</style>
