<template>
  <div class="home-layout">
    <TitleBar />
    <div class="home-body">
      <template v-if="sidebarStore.initialized">
        <Sidebar
          :active-route="currentRoute"
          @navigate="handleNavigate"
        />
        <ToggleButton
          :collapsed="sidebarStore.collapsed"
          @toggle="sidebarStore.toggleCollapsed()"
        />
      </template>
      <main class="main-content">
        <RouterView />
        <SettingsPanel v-if="uiStore.showSettings" />
        <ClosePromptDialog
          v-if="showClosePrompt"
          :show="showClosePrompt"
          @confirm="handleCloseConfirm"
          @close="showClosePrompt = false"
        />
      </main>
    </div>
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { useSidebarStore } from '../stores/sidebar'
import { useUiStore } from '../stores/ui'
import Sidebar from '../components/Sidebar.vue'
import ToggleButton from '../components/ToggleButton.vue'
import TitleBar from '../components/TitleBar.vue'
import StatusBar from '../components/StatusBar.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
import ClosePromptDialog from '../components/ClosePromptDialog.vue'

const router = useRouter()
const route = useRoute()
const sidebarStore = useSidebarStore()
const uiStore = useUiStore()

/** 当前路由路径，用于高亮状态 */
const currentRoute = ref(route.path)

/** 关闭询问弹窗显示状态 */
const showClosePrompt = ref(false)
/** 关闭监听清理函数 */
let cleanupCloseListener: (() => void) | null = null

/** 从持久化配置恢复侧边栏状态，注册关闭询问监听 */
onMounted(async () => {
  if (!window.electronAPI) return
  try {
    const cfg = await window.electronAPI.getConfig()
    if (cfg.sidebarCollapsed != null) {
      sidebarStore.setCollapsed(cfg.sidebarCollapsed)
    }
  } catch (err) {
    console.error('加载侧边栏配置失败:', err)
  }

  cleanupCloseListener = window.electronAPI.onClosePrompt(() => {
    showClosePrompt.value = true
  })
})

onUnmounted(() => {
  cleanupCloseListener?.()
})

/** 侧边栏状态变更时写回配置文件 */
watch(
  () => sidebarStore.collapsed,
  async (val) => {
    try {
      const cfg = await window.electronAPI.getConfig()
      cfg.sidebarCollapsed = val
      await window.electronAPI.saveConfig(cfg)
    } catch (err) {
      console.error('保存侧边栏状态失败:', err)
    }
  },
)

/** 导航到指定路由并更新高亮 */
function handleNavigate(path: string): void {
  router.push(path)
  currentRoute.value = path
}

// 监听路由变化以更新高亮并关闭设置面板
router.afterEach((to) => {
  currentRoute.value = to.path
  uiStore.closeSettings()
  uiStore.clearStatusText()
})

/** 处理关闭询问弹窗的选择 */
function handleCloseConfirm(result: CloseResult): void {
  showClosePrompt.value = false
  window.electronAPI?.sendCloseResult(result)
}
</script>

<style scoped>
.home-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
}

.home-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.main-content {
  flex: 1;
  overflow: hidden;
  background: #f5f5f5;
  position: relative;
}
</style>
