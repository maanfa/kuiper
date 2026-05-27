import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import { GlobeOutline } from '@vicons/ionicons5'
import type { Component } from 'vue'

/** 功能项数据结构 */
export interface FunctionItem {
  id: string
  title: string
  description: string
  route: string
  icon: Component
}

/** 侧边栏功能项列表 */
const DEFAULT_ITEMS: FunctionItem[] = [
  {
    id: 'terrain-tile',
    title: '地形切片工具',
    description:
      '支持全球高程数据的多级切片处理，可高效生成 TMS/WMTS 标准瓦片，适用于 Cesium、Mapbox 等三维地球引擎的地形渲染场景。',
    route: '/terrain-tile',
    icon: markRaw(GlobeOutline),
  },
]

export const useSidebarStore = defineStore('sidebar', () => {
  /** 配置是否已加载（防止渲染闪烁） */
  const initialized = ref(false)
  /** 侧边栏是否收缩 */
  const collapsed = ref(false)
  /** 功能项列表 */
  const functionItems: FunctionItem[] = [...DEFAULT_ITEMS]

  /** 切换侧边栏展开/收缩 */
  function toggleCollapsed(): void {
    if (!initialized.value) return
    collapsed.value = !collapsed.value
  }

  /** 设置侧边栏展开/收缩（用于从持久化配置恢复） */
  function setCollapsed(value: boolean): void {
    collapsed.value = value
    initialized.value = true
  }

  return {
    initialized,
    collapsed,
    functionItems,
    toggleCollapsed,
    setCollapsed,
  }
})
