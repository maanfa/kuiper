import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import { GlobeOutline, SwapHorizontalOutline, EyeOutline, CubeOutline } from '@vicons/ionicons5'
import type { Component } from 'vue'
import { ALL_TOOLS, type ToolDefinition } from '../../shared/tool-registry'

/** 功能项数据结构（扩展自 ToolDefinition，附加 UI 专属 icon） */
export interface FunctionItem extends ToolDefinition {
  icon: Component
}

/** 工具 ID → 图标映射（UI 专属，不放入纯数据层） */
const ICON_MAP: Record<string, Component> = {
  'terrain-tile': markRaw(GlobeOutline),
  'terrain-tile-converter': markRaw(SwapHorizontalOutline),
  'tileset-converter': markRaw(CubeOutline),
  'inspector': markRaw(EyeOutline),
}

/** 从工具注册表 + 图标映射构建功能项列表 */
function buildFunctionItems(): FunctionItem[] {
  return ALL_TOOLS.map(tool => ({
    ...tool,
    icon: ICON_MAP[tool.id] ?? markRaw(GlobeOutline),
  }))
}

export const useSidebarStore = defineStore('sidebar', () => {
  /** 配置是否已加载（防止渲染闪烁） */
  const initialized = ref(false)
  /** 侧边栏是否收缩 */
  const collapsed = ref(false)
  /** 功能项列表 */
  const functionItems: FunctionItem[] = buildFunctionItems()

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
