import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 全局 UI 状态 */
export const useUiStore = defineStore('ui', () => {
  /** 设置面板可见性 */
  const showSettings = ref(false)
  /** 状态栏路径文本 */
  const statusText = ref('')

  function toggleSettings(): void {
    showSettings.value = !showSettings.value
  }

  function closeSettings(): void {
    showSettings.value = false
  }

  function setStatusText(text: string): void {
    statusText.value = text
  }

  function clearStatusText(): void {
    statusText.value = ''
  }

  return { showSettings, statusText, toggleSettings, closeSettings, setStatusText, clearStatusText }
})
