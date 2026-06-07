import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import { GlobeOutline, SwapHorizontalOutline, EyeOutline, CubeOutline } from '@vicons/ionicons5'
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
    title: '地形切片生成器',
    description:
      '支持全球高程数据的多级切片处理，可高效生成 TMS/WMTS 标准瓦片，适用于 Cesium、Mapbox 等三维地球引擎的地形渲染场景。',
    route: '/terrain-tile',
    icon: markRaw(GlobeOutline),
  },
  {
    id: 'terrain-tile-converter',
    title: '地形切片转换器',
    description:
      'Cesium Quantized TerrainMesh 切片打包与解包工具，支持将瓦片目录打包为单个 SQLite 文件，或从 SQLite 文件还原瓦片目录。',
    route: '/terrain-tile-converter',
    icon: markRaw(SwapHorizontalOutline),
  },
  {
    id: 'inspector',
    title: '文件查看器',
    description:
      '打开并浏览 .cztr 地形包文件，查看内部瓦片索引与元数据信息。',
    route: '/inspector',
    icon: markRaw(EyeOutline),
  },
  {
    id: 'tileset-converter',
    title: '3DTiles 转换器',
    description:
      '将 3DTiles 数据集（tileset.json + 瓦片文件）打包为单个 .czts SQLite 文件，或从 .czts 文件还原 3DTiles 数据集。',
    route: '/tileset-converter',
    icon: markRaw(CubeOutline),
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
