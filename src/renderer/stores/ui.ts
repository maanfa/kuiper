import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 全局 UI 状态 */
export const useUiStore = defineStore('ui', () => {
  /** 设置面板可见性 */
  const showSettings = ref(false)

  function toggleSettings(): void {
    showSettings.value = !showSettings.value
  }

  function closeSettings(): void {
    showSettings.value = false
  }

  return { showSettings, toggleSettings, closeSettings }
})
