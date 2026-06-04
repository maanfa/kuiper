import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 全局 UI 状态 */
export const useUiStore = defineStore('ui', () => {
  /** 设置面板可见性 */
  const showSettings = ref(false)
  /** 状态栏路径文本 */
  const statusText = ref('')
  /** 状态栏闪烁消息（彩色标签） */
  const flashText = ref('')

  function toggleSettings(): void {
    showSettings.value = !showSettings.value
  }

  function closeSettings(): void {
    showSettings.value = false
  }

  let statusTimer: ReturnType<typeof setTimeout> | null = null

  function setStatusText(text: string): void {
    statusText.value = text
  }

  function clearStatusText(): void {
    statusText.value = ''
  }

  function flashStatusText(text: string, duration = 3000): void {
    if (statusTimer) clearTimeout(statusTimer)
    flashText.value = text
    statusTimer = setTimeout(() => {
      flashText.value = ''
      statusTimer = null
    }, duration)
  }

  return { showSettings, statusText, flashText, toggleSettings, closeSettings, setStatusText, clearStatusText, flashStatusText }
})
