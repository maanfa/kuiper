export type ToolCategory = 'processor' | 'inspector' | 'static-server'

export interface ToolDefinition {
  id: string
  title: string
  description: string
  route: string
  category: ToolCategory
}

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  processor: '数据处理',
  inspector: '观察工具',
  'static-server': '静态服务',
}

export const CATEGORY_ORDER: ToolCategory[] = ['processor', 'inspector', 'static-server']

export const ALL_TOOLS: ToolDefinition[] = [
  {
    id: 'terrain-tile',
    title: '地形切片生成器',
    description:
      '支持全球高程数据的多级切片处理，可高效生成 TMS/WMTS 标准瓦片，适用于 Cesium、Mapbox 等三维地球引擎的地形渲染场景。',
    route: '/terrain-tile',
    category: 'processor',
  },
  {
    id: 'terrain-tile-converter',
    title: '地形切片转换器',
    description:
      'Cesium Quantized TerrainMesh 切片打包与解包工具，支持将瓦片目录打包为单个 SQLite 文件，或从 SQLite 文件还原瓦片目录。',
    route: '/terrain-tile-converter',
    category: 'processor',
  },
  {
    id: 'tileset-converter',
    title: '3DTiles 转换器',
    description:
      '将 3DTiles 数据集（tileset.json + 瓦片文件）打包为单个 .czts SQLite 文件，或从 .czts 文件还原 3DTiles 数据集。',
    route: '/tileset-converter',
    category: 'processor',
  },
  {
    id: 'inspector',
    title: '文件查看器',
    description:
      '打开并浏览 .cztr / .czts 文件，查看内部表数据、瓦片详情与 JSON 内容。',
    route: '/inspector',
    category: 'inspector',
  },
  {
    id: 'static-server',
    title: '静态托管服务',
    description:
      '启动本地静态文件服务，将 .cztr / .czts 文件以 RESTful API 形式对外暴露，支持地形瓦片和 3DTiles 数据的按需访问。',
    route: '/static-server',
    category: 'static-server',
  },
]

export interface ToolGroup {
  key: ToolCategory
  label: string
  items: ToolDefinition[]
}

export function getToolGroups(tools: ToolDefinition[]): ToolGroup[] {
  const map = new Map<ToolCategory, ToolDefinition[]>()
  for (const tool of tools) {
    const list = map.get(tool.category)
    if (list) {
      list.push(tool)
    } else {
      map.set(tool.category, [tool])
    }
  }
  return CATEGORY_ORDER
    .filter(key => map.has(key))
    .map(key => ({ key, label: CATEGORY_LABELS[key], items: map.get(key)! }))
}
