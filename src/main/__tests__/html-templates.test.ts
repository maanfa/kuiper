import { describe, it, expect } from 'vitest'
import {
  formatSize,
  pageShell,
  fileListPage,
  fileDetailPage,
  errorPage,
  buildMetadataRows,
  cesiumCodeHtml,
} from '../server/html-templates'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

describe('formatSize', () => {
  it('格式化 B', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1023)).toBe('1023 B')
  })

  it('格式化 KB', () => {
    expect(formatSize(1024)).toBe('1.00 KB')
    expect(formatSize(1536)).toBe('1.50 KB')
    expect(formatSize(1048575)).toBe('1024.00 KB')
  })

  it('格式化 MB', () => {
    expect(formatSize(1048576)).toBe('1.00 MB')
    expect(formatSize(20971520)).toBe('20.00 MB')
  })

  it('格式化 GB', () => {
    expect(formatSize(1073741824)).toBe('1.00 GB')
    expect(formatSize(5368709120)).toBe('5.00 GB')
  })
})

describe('pageShell', () => {
  it('生成完整 HTML 页面', () => {
    const result = pageShell('测试标题', '/prefix', '<p>Hello</p>')
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('<title>测试标题 - Kuiper Static Server</title>')
    expect(result).toContain('<p>Hello</p>')
  })

  it('有 prefix 时包含返回链接', () => {
    const result = pageShell('Test', '/app', '')
    expect(result).toContain('<a href="/app" class="back">&larr; 返回列表</a>')
  })

  it('无 prefix 时不包含返回链接', () => {
    const result = pageShell('Test', '', '')
    expect(result).not.toContain('返回列表')
  })

  it('HTML 特殊字符直接嵌入 title（不转义）', () => {
    // pageShell 不转义 HTML，由模板调用方负责
    const result = pageShell('<b>Bold</b>', '', '')
    expect(result).toContain('<title><b>Bold</b> - Kuiper Static Server</title>')
  })
})

describe('fileListPage', () => {
  it('空列表显示暂无资源', () => {
    const result = fileListPage('/files', [])
    expect(result).toContain('暂无已启用的托管文件')
  })

  it('有资源时显示列表', () => {
    const items = [
      { id: 'abc12345', name: 'test.cztr' },
      { id: 'xyz67890', name: 'data.czts' },
    ]
    const result = fileListPage('/files', items)
    expect(result).toContain('共 2 个已启用资源')
    expect(result).toContain('abc12345')
    expect(result).toContain('test.cztr')
    expect(result).toContain('xyz67890')
    expect(result).toContain('data.czts')
  })

  it('显示列中 ID 截断为前 8 位', () => {
    const items = [{ id: 'abcdefgh-more-chars', name: 'test.cztr' }]
    const result = fileListPage('/files', items)
    expect(result).toContain('class="mono"')
    expect(result).toContain('>abcdefgh<')
    expect(result).toContain('href="/files/abcdefgh-more-chars"')
  })
})

describe('fileDetailPage', () => {
  it('显示文件名和元数据行', () => {
    const metadata: [string, string][] = [
      ['文件名', 'test.cztr'],
      ['文件大小', '1.00 MB'],
    ]
    const result = fileDetailPage('/files', 'test.cztr', metadata, '')
    expect(result).toContain('<h2>test.cztr</h2>')
    expect(result).toContain('文件大小')
    expect(result).toContain('1.00 MB')
  })

  it('包含 Cesium 集成代码区域', () => {
    const cesiumHtml = '<div class="code-section">测试代码</div>'
    const result = fileDetailPage('/files', 'test.czts', [], cesiumHtml)
    expect(result).toContain('测试代码')
  })
})

describe('errorPage', () => {
  it('显示状态码和错误信息', () => {
    const result = errorPage('/files', '未找到', '请求的资源不存在', 404)
    expect(result).toContain('404 未找到')
    expect(result).toContain('请求的资源不存在')
  })
})

describe('buildMetadataRows', () => {
  const base = {
    name: 'test.cztr',
    id: 'abc12345',
    fileSize: 1048576,
    tileCount: 100,
    minZoom: 0,
    maxZoom: 12,
    minX: 0,
    maxX: 4095,
    minY: 0,
    maxY: 4095,
  }

  it('基本字段', () => {
    const rows = buildMetadataRows(base)
    const labels = rows.map((r) => r[0])
    expect(labels).toContain('文件名')
    expect(labels).toContain('ID')
    expect(labels).toContain('文件大小')
    expect(labels).toContain('瓦片总数')
  })

  it('缩放范围和坐标范围', () => {
    const rows = buildMetadataRows(base)
    const labels = rows.map((r) => r[0])
    expect(labels).toContain('缩放范围')
    expect(labels).toContain('X 范围')
    expect(labels).toContain('Y 范围')
  })

  it('minZoom 为 null 时不显示范围', () => {
    const rows = buildMetadataRows({ ...base, minZoom: null })
    const labels = rows.map((r) => r[0])
    expect(labels).not.toContain('缩放范围')
  })

  it('czts 扩展字段', () => {
    const rows = buildMetadataRows({
      ...base,
      binaryCount: 50,
      tilesetCount: 3,
      sourceDirectory: '/data/source',
    })
    const labels = rows.map((r) => r[0])
    expect(labels).toContain('二进制文件数')
    expect(labels).toContain('Tileset 数')
    expect(labels).toContain('源目录')
  })

  it('缺少扩展字段时不显示', () => {
    const rows = buildMetadataRows(base)
    const labels = rows.map((r) => r[0])
    expect(labels).not.toContain('二进制文件数')
  })
})

describe('cesiumCodeHtml', () => {
  it('cztr 地形生成地形代码', () => {
    const result = cesiumCodeHtml(9356, '/files', 'abc12345', '/data/dem.cztr')
    expect(result).toContain('CesiumTerrainProvider.fromUrl')
    expect(result).not.toContain('Cesium3DTileset')
  })

  it('czts 生成 3DTiles 代码', () => {
    const result = cesiumCodeHtml(9356, '/files', 'abc12345', '/data/b3dm.czts')
    expect(result).toContain('Cesium3DTileset.fromUrl')
    expect(result).not.toContain('CesiumTerrainProvider')
  })

  it('包含 ES6 和 namespace 两种导入方式', () => {
    const result = cesiumCodeHtml(9356, '/files', 'abc', '/test.cztr')
    expect(result).toContain('ES6 Import')
    expect(result).toContain('Namespace')
  })

  it('包含复制按钮', () => {
    const result = cesiumCodeHtml(9356, '/files', 'abc', '/test.czts')
    expect(result).toContain('复制')
  })
})
