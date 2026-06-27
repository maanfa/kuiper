# 柯伊伯方盒 (kuiper-box)

基于 Electron + Vue 3 + Naive UI 的桌面工具集，提供地形切片处理、3DTiles 转换、静态文件托管、SQLite 文件浏览等地理信息相关功能。

## 功能

- **地形切片生成器** — 基于 mago-3d-terrainer，将 GeoTIFF 高程数据转换为多级地形瓦片
- **地形切片转换器** — 将 Cesium Quantized TerrainMesh 瓦片目录打包为 `.cztr` 容器，或从中还原
- **3DTiles 转换器** — 将 3DTiles 数据集打包为 `.czts` 容器，或从中还原
- **文件查看器** — 打开并浏览 `.cztr` / `.czts` 文件，查看表数据、瓦片详情和 JSON 内容
- **静态托管服务** — 将 `.cztr` / `.czts` 文件以 RESTful API 对外暴露，支持地形瓦片和 3DTiles 按需访问
- **静态文件服务** — 将指定目录通过 HTTP 对外提供，支持目录浏览（类似 nginx autoindex）
- **任务中心** — 统一查看运行中的服务和后台任务，支持远程停止/取消

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

- [静态托管服务使用指南](docs/static-server.md)
- [开发约定索引](AGENTS.md)

### skill 参考

- [地形切片转换器](skills/terrain-tile-converter/SKILL.md) — 打包/解包 Cesium Quantized TerrainMesh 切片
- [文件查看器](skills/file-inspector/SKILL.md) — 浏览 .cztr / .czts 文件
- [CZTR 文件格式](skills/cztr-format/SKILL.md) — .cztr 容器 Schema
- [CZTS 文件格式](skills/czts-format/SKILL.md) — .czts 容器 Schema

## 许可证

MIT
