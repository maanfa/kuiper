<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { SettingsOutline } from '@vicons/ionicons5'

defineProps<{
  showSettings?: boolean
}>()

const emit = defineEmits<{
  'toggle-settings': []
}>()

const api = window.electronAPI

const isPackaged = ref(true)
const isMaximized = ref(false)

const appTitle = computed(() => isPackaged.value ? '柯伊伯方盒' : '柯伊伯方盒 - [DevMode]')

let cleanupMaximize: (() => void) | null = null

onMounted(async () => {
  try {
    isPackaged.value = await api.isPackaged()
  } catch {
    // fallback
  }

  try {
    isMaximized.value = await api.isMaximized()
  } catch {
    // fallback
  }

  cleanupMaximize = api.onMaximizeChanged((maximized) => {
    isMaximized.value = maximized
  })
})

onUnmounted(() => {
  cleanupMaximize?.()
})

function handleMinimize() {
  api.minimizeWindow()
}

function handleMaximize() {
  api.maximizeWindow()
}

function handleClose() {
  api.closeWindow()
}
</script>

<template>
  <header class="title-bar" @dblclick="handleMaximize">
    <div class="title-bar-left">
      <span class="title-bar-text">{{ appTitle }}</span>
    </div>
    <div class="title-bar-right">
      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton
            size="tiny"
            quaternary
            :type="showSettings ? 'primary' : 'default'"
            class="title-bar-settings-btn"
            @click="emit('toggle-settings')"
          >
            <template #icon>
              <NIcon size="15">
                <SettingsOutline />
              </NIcon>
            </template>
          </NButton>
        </template>
        设置
      </NTooltip>
      <div class="title-bar-divider" />
      <button
        class="title-bar-btn"
        aria-label="最小化"
        @click="handleMinimize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
        </svg>
      </button>
      <button
        class="title-bar-btn"
        :aria-label="isMaximized ? '还原' : '最大化'"
        @click="handleMaximize"
      >
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
          <rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1" />
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12">
          <rect x="3" y="0.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1" />
          <rect x="0.5" y="3.5" width="8" height="8" rx="1" fill="#fafafa" stroke="currentColor" stroke-width="1" />
        </svg>
      </button>
      <button
        class="title-bar-btn title-bar-btn--close"
        aria-label="关闭"
        @click="handleClose"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M 1 1 L 11 11 M 11 1 L 1 11" fill="none" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
  -webkit-app-region: drag;
  user-select: none;
  padding-left: 12px;
}

.title-bar-left {
  display: flex;
  align-items: center;
}

.title-bar-text {
  font-size: 13px;
  color: #666;
}

.title-bar-right {
  display: flex;
  align-items: center;
  height: 100%;
  -webkit-app-region: no-drag;
}

.title-bar-settings-btn {
  width: 36px;
  height: 32px;
  padding: 0;
}

.title-bar-divider {
  width: 1px;
  height: 16px;
  background: #e8e8e8;
  margin: 0 2px;
}

.title-bar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  border-radius: 0;
  padding: 0;
  transition: background 0.15s, color 0.15s;
}

.title-bar-btn:hover {
  background: #e8e8e8;
  color: #333;
}

.title-bar-btn--close:hover {
  background: #e81123;
  color: #fff;
}
</style>
