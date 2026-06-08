export function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return bytes + ' B'
}

export function pageShell(title: string, prefix: string, body: string): string {
  const backLink = prefix ? `<a href="${prefix}" class="back">&larr; 返回列表</a>` : ''
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - Kuiper Static Server</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
  padding: 40px 20px;
}
.container { max-width: 800px; margin: 0 auto; }
h2 { font-size: 20px; color: #1a1a1a; margin-bottom: 4px; }
.sub { color: #999; font-size: 13px; margin-bottom: 20px; }
table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
th, td {
  padding: 10px 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}
th { background: #fafafa; font-weight: 600; color: #555; width: 140px; }
td { color: #333; }
a { color: #36ad6a; text-decoration: none; }
a:hover { text-decoration: underline; }
.mono { font-family: 'Courier New', monospace; font-size: 13px; color: #888; }
.empty { text-align: center; color: #bbb; padding: 32px !important; }
.back { display: inline-block; margin-bottom: 16px; font-size: 13px; }
.code-section { margin-top: 24px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
.code-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #fafafa; border-bottom: 1px solid #f0f0f0; }
.code-header h3 { font-size: 14px; color: #333; font-weight: 600; }
.code-toggle { display: flex; gap: 0; background: #eee; border-radius: 6px; padding: 2px; }
.code-toggle button { border: none; background: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; color: #666; transition: all 0.15s; }
.code-toggle button.active { background: #fff; color: #333; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
pre.code-block { margin: 0; padding: 16px; background: #1e1e1e; color: #d4d4d4; font-family: 'Consolas','Courier New',monospace; font-size: 13px; line-height: 1.5; overflow-x: auto; display: none; }
pre.code-block.active { display: block; }
.copy-btn { border: 1px solid #e0e0e0; background: #fff; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; color: #555; }
.copy-btn:hover { background: #f5f5f5; }
</style>
</head>
<body>
<div class="container">
${backLink}
${body}
</div>
</body>
</html>`
}

export function fileListPage(prefix: string, items: { id: string, name: string }[]): string {
  const rows = items
    .map(
      (item) => `<tr><td><a href="${prefix}/${item.id}">${item.name}</a></td><td class="mono">${item.id.slice(0, 8)}</td></tr>`,
    )
    .join('\n')

  return pageShell('资源列表', prefix, `
    <h2>资源列表</h2>
    <p class="sub">共 ${items.length} 个已启用资源</p>
    <table>
      <thead><tr><th>名称</th><th>ID</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="2" class="empty">暂无已启用的托管文件</td></tr>'}</tbody>
    </table>
  `)
}

export function fileDetailPage(prefix: string, name: string, metadataRows: [string, string][], cesiumHtml: string): string {
  const tableRows = metadataRows
    .map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`)
    .join('\n')

  return pageShell(name, prefix, `
    <h2>${name}</h2>
    <p class="sub">文件元数据</p>
    <table>
      <tbody>${tableRows}</tbody>
    </table>
    ${cesiumHtml}
  `)
}

export function errorPage(prefix: string, title: string, message: string, status: number): string {
  return pageShell(title, prefix, `<h2>${status} ${title}</h2><p>${message}</p>`)
}

export function buildMetadataRows(metadata: {
  name: string
  id: string
  fileSize: number
  tileCount: number
  minZoom: number | null
  maxZoom: number | null
  minX: number | null
  maxX: number | null
  minY: number | null
  maxY: number | null
  binaryCount?: number
  tilesetCount?: number
  sourceDirectory?: string
}): [string, string][] {
  const rows: [string, string][] = [
    ['文件名', metadata.name],
    ['ID', `<span class="mono">${metadata.id}</span>`],
    ['文件大小', formatSize(metadata.fileSize)],
    ['瓦片总数', metadata.tileCount.toLocaleString()],
  ]
  if (metadata.minZoom !== null) {
    rows.push(['缩放范围', `z${metadata.minZoom} - z${metadata.maxZoom}`])
    rows.push(['X 范围', `${metadata.minX} - ${metadata.maxX}`])
    rows.push(['Y 范围', `${metadata.minY} - ${metadata.maxY}`])
  }
  if (metadata.binaryCount !== undefined) {
    rows.push(['二进制文件数', metadata.binaryCount.toLocaleString()])
  }
  if (metadata.tilesetCount !== undefined) {
    rows.push(['Tileset 数', metadata.tilesetCount.toLocaleString()])
  }
  if (metadata.sourceDirectory) {
    rows.push(['源目录', metadata.sourceDirectory])
  }
  return rows
}

export function cesiumCodeHtml(port: number, prefix: string, fileId: string, filePath: string): string {
  const baseUrl = `http://localhost:${port}${prefix}/${fileId}`
  const isTerrain = filePath.toLowerCase().endsWith('.cztr')

  if (isTerrain) {
    const es6 = `import { CesiumTerrainProvider, Viewer } from 'cesium'

const viewer = new Viewer('cesiumContainer', {
  terrainProvider: await CesiumTerrainProvider.fromUrl(
    '${baseUrl}/tiles'
  ),
})`
    const ns = `const viewer = new Cesium.Viewer('cesiumContainer', {
  terrainProvider: await Cesium.CesiumTerrainProvider.fromUrl(
    '${baseUrl}/tiles'
  ),
})`
    return codeSectionHtml('Cesium 集成代码', es6, ns)
  }

  const es6 = `import { Cesium3DTileset, Viewer } from 'cesium'

const viewer = new Viewer('cesiumContainer')
const tileset = await Cesium3DTileset.fromUrl(
  '${baseUrl}/tileset.json'
)
viewer.scene.primitives.add(tileset)
viewer.flyTo(tileset)`
  const ns = `const viewer = new Cesium.Viewer('cesiumContainer')
const tileset = await Cesium.Cesium3DTileset.fromUrl(
  '${baseUrl}/tileset.json'
)
viewer.scene.primitives.add(tileset)
viewer.flyTo(tileset)`
  return codeSectionHtml('Cesium 集成代码', es6, ns)
}

function codeSectionHtml(heading: string, es6: string, ns: string): string {
  const uid = `c${Math.random().toString(36).slice(2, 8)}`
  return `
<div class="code-section">
  <div class="code-header">
    <h3>${heading}</h3>
    <div style="display:flex;align-items:center;gap:12px">
      <div class="code-toggle">
        <button id="${uid}-btn-es6" class="active" onclick="switchStyle('${uid}','es6')">ES6 Import</button>
        <button id="${uid}-btn-ns" onclick="switchStyle('${uid}','ns')">Namespace</button>
      </div>
      <button class="copy-btn" id="${uid}-copy" onclick="copyCode('${uid}')">复制</button>
    </div>
  </div>
  <pre id="${uid}-es6" class="code-block active"><code>${escapeHtml(es6)}</code></pre>
  <pre id="${uid}-ns" class="code-block"><code>${escapeHtml(ns)}</code></pre>
</div>
<script>
(function() {
  window.switchStyle = function(uid, style) {
    document.getElementById(uid + '-es6').classList.remove('active')
    document.getElementById(uid + '-ns').classList.remove('active')
    document.getElementById(uid + '-' + style).classList.add('active')
    document.getElementById(uid + '-btn-es6').classList.remove('active')
    document.getElementById(uid + '-btn-ns').classList.remove('active')
    document.getElementById(uid + '-btn-' + style).classList.add('active')
  }
  window.copyCode = function(uid) {
    var section = document.getElementById(uid + '-copy').closest('.code-section')
    var active = section.querySelector('pre.code-block.active code')
    if (!active) return
    var text = active.textContent || ''
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById(uid + '-copy')
        btn.textContent = '已复制'
        setTimeout(function() { btn.textContent = '复制' }, 1500)
      })
    } else {
      var ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      var btn = document.getElementById(uid + '-copy')
      btn.textContent = '已复制'
      setTimeout(function() { btn.textContent = '复制' }, 1500)
    }
  }
})()
</script>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
