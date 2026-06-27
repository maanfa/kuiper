# 柯伊伯方盒 (kuiper-box)

基于 Electron + Vue 3 + Naive UI 的桌面工具集，提供地形切片生成/转换、3DTiles 转换、静态文件托管、SQLite 文件浏览等地理信息数据处理功能。

## 平台兼容性

当前仅在 **Windows 10 / Windows 11** 上完成完整测试并确认可用。macOS 理论上可编译运行，但尚未进行兼容性验证，相关路径处理（Windows 风格反斜杠、PowerShell 解压等）可能存在适配问题，需自行测试。

## 功能

### 地形切片生成器

基于 [mago-3d-terrainer](https://github.com/Gaia3D/mago-3d-terrainer) 引擎，将 GeoTIFF 高程数据（`.tif`）转换为多级地形瓦片（Quantized Mesh），输出 TMS 标准瓦片目录，可直接用于 Cesium 等三维地球引擎的地形渲染。

- 输入：包含 GeoTIFF 文件的目录
- 输出：按 `z/x/y` 层级组织的瓦片目录
- 支持缩放范围自定义（0–22 级）、多种高级参数（geoid、插值方式、法线计算、断点续传等）
- 自动检测或一键下载 JDK 21 及 mago-3d-terrainer jar 包

### 地形切片转换器

将 Cesium Quantized TerrainMesh 瓦片目录（松散文件）打包为单个 `.cztr` SQLite 容器文件，或从 `.cztr` 容器还原瓦片目录。适用于瓦片数据的存储、传输和部署场景。

- 打包：`<瓦片目录>` → `output.cztr`
- 解包：`input.cztr` → `<瓦片目录>`
- 支持自定义图层名和批量大小

### 3DTiles 转换器

将 3DTiles 数据集（`tileset.json` + 瓦片文件）打包为单个 `.czts` SQLite 容器文件，或从 `.czts` 容器还原完整 3DTiles 数据集。

- 打包：指定 `tileset.json` → `output.czts`
- 解包：`input.czts` → 完整 3DTiles 目录
- 适用场景：3DTiles 数据的归档、迁移和发布

### 文件查看器

打开并浏览 `.cztr` 和 `.czts` 文件，支持多标签页切换，查看内部各表数据、瓦片坐标/数据大小/JSON 内容等详情。

- 全景摘要：文件大小、瓦片数量、各表行数
- 表数据浏览：分页搜索查看 tiles / tilesets / metadata 表
- 瓦片查询：按 z/x/y 或 URI 定位瓦片，查看大小和 JSON 内容
- 瓦片导出：将单个瓦片保存为独立文件

### 静态托管服务

将 `.cztr` 或 `.czts` 文件以 RESTful API 形式对外暴露 HTTP 服务，客户端可按瓦片坐标或 URI 动态请求数据，适用于 Cesium 等引擎的在线加载场景。

- 支持同时托管多个文件，每个文件按路径生成唯一 8 位哈希 ID
- SQLite 连接池（LRU 淘汰），避免反复开关数据库
- 运行中可热更新托管列表（添加/移除/启停文件），无需重启
- API 端点跟随前缀路径（默认 `/files`），支持 list / tile / tileset 等接口

### 静态文件服务

启动本地 HTTP 服务，将指定目录下的所有文件通过 HTTP 对外提供，类似 nginx 的静态文件托管。

- 支持自定义端口、URL 前缀、根目录
- 自动生成 HTML 目录浏览页（文件大小、类型图标、返回上级）
- 目录浏览开关可按需禁用
- 与静态托管服务相互独立，可同时运行在不同端口

### 任务中心

统一监控和管理运行中的后台任务及 HTTP 服务。

- **全页面入口**：标题栏按钮（带运行中任务数角标），完整的服务状态和后台任务管理页
- **快捷面板入口**：状态栏右侧按钮，浮动在右下角的紧凑面板，方便随时查看
- 支持远程停止运行中的服务、取消进行中的任务
- 服务状态和任务列表实时推送更新，无需轮询

## 技术栈

- **Electron** 42.x + **electron-vite** 5.x
- **Vite** 8.x
- **TypeScript** 6.x
- **Vue** 3.x + **Vue Router** 5.x + **Naive UI** 2.x
- **Pinia** 3.x
- **Hono** 4.x（内嵌 HTTP 服务）
- **pnpm** 10.x
- **oxlint** + **oxfmt**（代码检查与格式化）
- **tsx**（构建脚本运行）

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发模式
pnpm dev

# 代码检查
pnpm lint

# 代码格式化
pnpm fmt
```

## 构建

```bash
# 页面构建（electron-vite build）
pnpm build

# 安装包构建（输出到 release/win_unpacked）
pnpm dist
```

## 项目结构

```
kuiper/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── server/        #   内嵌 HTTP 服务（Hono）
│   │   ├── task/          #   任务调度系统
│   │   └── terrain-gen/   #   地形生成器
│   ├── preload/           # 预加载脚本
│   ├── renderer/          # 渲染进程（Vue 前端）
│   │   ├── components/    #   通用组件
│   │   ├── composables/   #   Vue composable
│   │   ├── views/         #   页面视图
│   │   ├── stores/        #   Pinia 全局状态
│   │   ├── router/        #   路由配置
│   │   └── utils/         #   工具函数
│   └── shared/            # 主进程/渲染进程共享模块
├── docs/                  # 文档
│   ├── conventions/       #   开发约定（架构/代码规范/工程/Agent 协作）
│   └── static-server.md   #   静态托管服务使用指南
├── skills/                # AI 开发者技术参考
├── scripts/               # 构建脚本
├── AGENTS.md              # 项目约定索引
├── electron.vite.config.ts
├── electron-builder.yml
└── app.config.yml         # 应用配置文件
```

## 文档

- [静态托管服务使用指南](docs/static-server.md) — API 端点、Cesium 集成等
- [开发约定索引](AGENTS.md) — 代码风格、组件规范、架构约定等

### skill 参考（面向 AI 开发者）

- [地形切片转换器](skills/terrain-tile-converter/SKILL.md) — 打包/解包 Cesium Quantized TerrainMesh 切片
- [文件查看器](skills/file-inspector/SKILL.md) — 浏览 .cztr / .czts 文件
- [CZTR 文件格式](skills/cztr-format/SKILL.md) — .cztr 容器 Schema
- [CZTS 文件格式](skills/czts-format/SKILL.md) — .czts 容器 Schema

## 系统要求

- **Windows 10** 或 **Windows 11**（当前仅此环境完成完整测试）
- 如需使用地形切片生成器，需 JDK 21 或以上版本（可通过应用内一键下载）

## 许可证

MIT
