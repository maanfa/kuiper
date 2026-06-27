<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import {
  NButton,
  NIcon,
  NProgress,
  NCard,
  NText,
  NAlert,
  NSpace,
  NTooltip,
  NDivider,
  NPopover,
} from 'naive-ui'
import {
  CheckmarkCircleOutline,
  WarningOutline,
  CloudDownloadOutline,
  SettingsOutline,
  OpenOutline,
  InformationCircleOutline,
} from '@vicons/ionicons5'

const props = defineProps<{
  jdkReady: boolean
  jarReady: boolean
  jdkPath: string
  jarPath: string
  jdkError: string
  jarError: string
  javaVersion: string
}>()

const emit = defineEmits<{
  navigateSettings: []
  refresh: []
}>()

const downloadingJdk = ref(false)
const downloadingJar = ref(false)
const jdkProgress = ref(0)
const jarProgress = ref(0)
const downloadError = ref('')

let unprogressCleanup: (() => void) | null = null
let uncompleteCleanup: (() => void) | null = null

function cleanupListeners(): void {
  unprogressCleanup?.()
  uncompleteCleanup?.()
  unprogressCleanup = null
  uncompleteCleanup = null
}

onUnmounted(() => {
  cleanupListeners()
})

async function handleDownloadJdk(): Promise<void> {
  downloadingJdk.value = true
  jdkProgress.value = 0
  downloadError.value = ''

  unprogressCleanup = window.electronAPI.onGenDownloadProgress((p) => {
    if (p.type === 'jdk' && p.total > 0) {
      jdkProgress.value = Math.round((p.received / p.total) * 100)
    }
  })

  uncompleteCleanup = window.electronAPI.onGenDownloadComplete((result) => {
    if (result.type !== 'jdk') return
    downloadingJdk.value = false
    cleanupListeners()
    if (result.success) {
      emit('refresh')
    } else {
      downloadError.value = result.error || '下载失败'
    }
  })

  try {
    const result = await window.electronAPI.downloadJdk()
    if (!result.success) {
      downloadingJdk.value = false
      cleanupListeners()
      downloadError.value = result.error || '下载失败'
    }
  } catch (err) {
    downloadingJdk.value = false
    cleanupListeners()
    downloadError.value = `下载异常: ${err}`
  }
}

async function handleDownloadJar(): Promise<void> {
  downloadingJar.value = true
  jarProgress.value = 0
  downloadError.value = ''

  unprogressCleanup = window.electronAPI.onGenDownloadProgress((p) => {
    if (p.type === 'jar' && p.total > 0) {
      jarProgress.value = Math.round((p.received / p.total) * 100)
    }
  })

  uncompleteCleanup = window.electronAPI.onGenDownloadComplete((result) => {
    if (result.type !== 'jar') return
    downloadingJar.value = false
    cleanupListeners()
    if (result.success) {
      emit('refresh')
    } else {
      downloadError.value = result.error || '下载失败'
    }
  })

  try {
    const result = await window.electronAPI.downloadJar()
    if (!result.success) {
      downloadingJar.value = false
      cleanupListeners()
      downloadError.value = result.error || '下载失败'
    }
  } catch (err) {
    downloadingJar.value = false
    cleanupListeners()
    downloadError.value = `下载异常: ${err}`
  }
}

function openGithubReleases(): void {
  window.electronAPI.openExternal('https://github.com/Gaia3D/mago-3d-terrainer/releases')
}
</script>

<template>
  <div class="gen-setup">
    <NCard title="运行环境" size="small" class="setup-card">
      <NSpace vertical size="medium">
        <!-- JDK 状态 -->
        <div class="env-item">
          <div class="env-header">
            <NIcon v-if="props.jdkReady" color="#18a058" size="18">
              <CheckmarkCircleOutline />
            </NIcon>
            <NIcon v-else color="#f0a020" size="18">
              <WarningOutline />
            </NIcon>
            <NText strong>JDK</NText>
            <NText v-if="props.javaVersion" depth="3" style="font-size: 12px">
              ({{ props.javaVersion }})
            </NText>
            <NPopover v-if="props.jdkReady && props.jdkPath" trigger="click" placement="right">
              <template #trigger>
                <NButton size="tiny" quaternary style="padding: 0 4px; height: 18px">
                  <template #icon>
                    <NIcon size="14" color="#999"><InformationCircleOutline /></NIcon>
                  </template>
                </NButton>
              </template>
              <div style="font-size: 12px; max-width: 320px; word-break: break-all; font-family: 'Maple Mono', monospace">
                {{ props.jdkPath }}
              </div>
            </NPopover>
          </div>

          <template v-if="!props.jdkReady">
            <NText depth="3" style="font-size: 12px; margin-bottom: 6px">
              未检测到可用的 JDK（需要 17 或更高版本），可点击下方按钮自动下载 Microsoft JDK 21
            </NText>
            <NText
              v-if="props.jdkError"
              depth="3"
              style="font-size: 11px; color: #999; margin-bottom: 8px"
            >
              {{ props.jdkError }}
            </NText>
            <NButton
              size="small"
              type="primary"
              :loading="downloadingJdk"
              :disabled="downloadingJar"
              @click="handleDownloadJdk"
            >
              <template #icon>
                <NIcon size="16"><CloudDownloadOutline /></NIcon>
              </template>
              一键下载 Microsoft JDK 21
            </NButton>
            <NProgress
              v-if="downloadingJdk && jdkProgress > 0"
              :percentage="jdkProgress"
              :height="4"
              style="margin-top: 8px"
            />
          </template>
        </div>

        <NDivider style="margin: 4px 0" />

        <!-- Jar 状态 -->
        <div class="env-item">
          <div class="env-header">
            <NIcon v-if="props.jarReady" color="#18a058" size="18">
              <CheckmarkCircleOutline />
            </NIcon>
            <NIcon v-else color="#f0a020" size="18">
              <WarningOutline />
            </NIcon>
            <NText strong>mago-3d-terrainer 1.13.0</NText>
            <NPopover v-if="props.jarReady && props.jarPath" trigger="click" placement="right">
              <template #trigger>
                <NButton size="tiny" quaternary style="padding: 0 4px; height: 18px">
                  <template #icon>
                    <NIcon size="14" color="#999"><InformationCircleOutline /></NIcon>
                  </template>
                </NButton>
              </template>
              <div style="font-size: 12px; max-width: 320px; word-break: break-all; font-family: 'Maple Mono', monospace">
                {{ props.jarPath }}
              </div>
            </NPopover>
          </div>

          <template v-if="!props.jarReady">
            <NText depth="3" style="font-size: 12px; margin-bottom: 6px">
              未检测到 Jar 包，可点击下方按钮自动下载
            </NText>
            <NText
              v-if="props.jarError"
              depth="3"
              style="font-size: 11px; color: #999; margin-bottom: 8px"
            >
              {{ props.jarError }}
            </NText>
            <NButton
              size="small"
              type="primary"
              :loading="downloadingJar"
              :disabled="downloadingJdk"
              @click="handleDownloadJar"
            >
              <template #icon>
                <NIcon size="16"><CloudDownloadOutline /></NIcon>
              </template>
              一键下载 Jar 包
            </NButton>
            <NProgress
              v-if="downloadingJar && jarProgress > 0"
              :percentage="jarProgress"
              :height="4"
              style="margin-top: 8px"
            />
          </template>
        </div>

        <!-- 下载失败提示 -->
        <NAlert v-if="downloadError" type="warning" :bordered="false" style="margin-top: 8px">
          <template #header>
            {{ downloadError }}
          </template>
          <NSpace style="margin-top: 8px">
            <NButton size="tiny" @click="openGithubReleases">
              <template #icon>
                <NIcon size="14"><OpenOutline /></NIcon>
              </template>
              打开 GitHub 发布页面
            </NButton>
          </NSpace>
        </NAlert>
      </NSpace>
    </NCard>

    <div class="setup-footer">
      <NText depth="3" style="font-size: 12px">
        如有已下载好的 JDK 和 Jar，可手动设置路径
      </NText>
      <NTooltip placement="top">
        <template #trigger>
          <NButton size="small" quaternary @click="emit('navigateSettings')">
            <template #icon>
              <NIcon size="16"><SettingsOutline /></NIcon>
            </template>
            手动配置
          </NButton>
        </template>
        在设置中配置 JDK 和 Jar 包路径
      </NTooltip>
    </div>
  </div>
</template>

<style scoped>
.gen-setup {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.setup-card {
  flex: 1;
  border: none;
  background: transparent;
  box-shadow: none;
}

.setup-card :deep(.n-card__content) {
  padding: 0;
}

.env-item {
  display: flex;
  flex-direction: column;
}

.env-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.setup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0 0;
  border-top: 1px solid #f0f0f0;
  margin-top: auto;
}
</style>
