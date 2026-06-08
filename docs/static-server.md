# 静态托管服务

静态托管服务可将本地的 `.cztr` / `.czts` 文件以 RESTful HTTP API 形式对外暴露，方便在 Cesium、Mapbox 等三维引擎中按需加载地形瓦片或 3DTiles 数据。

## 配置

在左侧面板中设置以下参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| 端口 | 数字 | `9356` | HTTP 服务监听端口，范围 1024–65535 |
| 前缀路径 | 字符串 | `/files` | 所有 API 路径的前缀，须以 `/` 开头 |
| 最大连接数 | 数字 | `10` | SQLite 连接池上限，范围 1–100 |

端口和前缀路径在服务启动后不可修改，需先停止再调整。

## 管理托管文件

点击「添加」按钮选择本地的 `.cztr` 或 `.czts` 文件加入托管列表。每个文件会被分配一个基于路径的稳定哈希 ID（同一文件始终获得相同 ID）。

| 列名 | 说明 |
|------|------|
| ★ | 选中标记，单击行后显示绿色箭头 |
| 文件名 | 文件的原始名称 |
| ID | 基于文件路径的 8 位哈希标识 |
| 状态 | 开关控制此文件是否对外服务 |
| 连接 | 文件是否已缓存在连接池中（显示「已连接」） |
| 操作 | 从列表中移除该文件 |

**热更新：** 服务运行中也可以添加、移除、启停文件，变更即时生效，无需重启。

**文件详情：** 点击表格行，上方卡片显示该文件的路径、大小、瓦片数。点击空白区域取消选中。空选时卡片提示「点击表格行可查看文件详情」。

## 启停服务

配置好端口和至少一个托管文件后，点击「启动服务」按钮。右侧请求日志面板将实时显示所有 HTTP 请求记录。

工具栏标题旁的图标按钮可一键在系统默认浏览器中打开服务主页。

关闭窗口时若服务仍在运行，会弹出确认对话框询问是否停止服务并退出。

## RESTful API

所有端点均以 `http://localhost:{port}{prefix}` 为基础路径，下文以默认配置 `http://localhost:9356/files` 为例。

### `GET /files`

返回简易 HTML 页面，列出所有已启用文件的名称和 ID。浏览器访问可直接浏览。

追加 `?fmt=json` 返回 JSON：

```json
{
  "count": 2,
  "items": [
    { "id": "a1b2c3d4-...", "name": "dem.cztr", "path": "C:/data/dem.cztr" },
    { "id": "e5f6g7h8-...", "name": "buildings.czts", "path": "C:/data/buildings.czts" }
  ]
}
```

### `GET /files/:id`

返回指定文件的元数据与 Cesium 集成代码。支持 `?fmt=json` 以 JSON 形式返回。

HTML 页面展示内容包括：文件名、ID、文件大小、瓦片总数、缩放范围（仅 cztr）、源目录（仅 czts）等。页面底部提供 Cesium 代码段，可在「ES6 Import」和「Namespace」两种风格间切换，并支持一键复制。

JSON 响应示例（cztr）：

```json
{
  "id": "a1b2c3d4-...",
  "name": "dem.cztr",
  "fileSize": 52428800,
  "tileCount": 54321,
  "minZoom": 0,
  "maxZoom": 15,
  "minX": 0,
  "maxX": 32767,
  "minY": 0,
  "maxY": 32767
}
```

### `GET /files/:id/tileset.json`

返回 czts 文件中的 tileset 清单 JSON（来自 `tilesets` 表的第一条记录）。

### `GET /files/:id/tiles/:z/:x/:y`

返回 cztr 文件中指定层行列的瓦片二进制数据，`Content-Type: application/octet-stream`。

### `GET /files/:id/*`

按 URI 返回 czts 文件中的任意内容（二进制数据）。适用于 3DTiles 的 `.b3dm`、`.i3dm`、`.glb` 等资源的按需加载。

## Cesium 集成

在 Cesium 中使用托管服务加载数据的示例代码。

### 地形瓦片（cztr）

```
ES6 Import 风格：
import { CesiumTerrainProvider, Viewer } from 'cesium'

const viewer = new Viewer('cesiumContainer', {
  terrainProvider: await CesiumTerrainProvider.fromUrl(
    'http://localhost:9356/files/{文件ID}/tiles'
  ),
})
```

### 3DTiles（czts）

```
ES6 Import 风格：
import { Cesium3DTileset, Viewer } from 'cesium'

const viewer = new Viewer('cesiumContainer')
const tileset = await Cesium3DTileset.fromUrl(
  'http://localhost:9356/files/{文件ID}/tileset.json'
)
viewer.scene.primitives.add(tileset)
viewer.flyTo(tileset)
```

> 在浏览器中访问 `/files/:id` 页面可直接查看并复制适配当前文件的完整代码。

## 连接池

服务启动时会创建 SQLite 连接池，保持至多「最大连接数」个数据库连接不关闭，避免每次请求重新打开文件带来的性能开销。

**淘汰策略：** 连接数达到上限时，自动关闭最久未访问的数据库连接。

**预警机制：** 若 60 秒内发生 3 次及以上连接淘汰，右侧日志面板会输出警告，建议调大「最大连接数」。

服务运行期间，表格「连接」列显示当前缓存状态，已缓存文件标注为绿色「已连接」。

## 退出守卫

关闭窗口时若服务仍在运行，将弹出 NaiveUI 风格的确认对话框，标题「静态服务正在运行」。选择「停止服务并退出」后程序会先关闭服务再退出，避免后台遗留端口占用。选择「取消」则返回主界面。
