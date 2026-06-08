# AGENTS

本文档持续记录对本项目的开发习惯和约定，供 AI Agent 在执行任务时参考。

## 代码风格

- 使用**单引号**（single quote）
- 所有语句末尾**不加分号**（no semi）
- 使用**尾随逗号**（trailing commas: all）
- 使用 **2 空格缩进**（2-space indent）
- 仅在需要时手动执行 lint 和 format，不在保存时自动触发

## 技术栈

- pnpm 作为包管理器
- Electron 42.x + electron-vite 5.x
- Vite 8.x（通过 pnpm.peerDependencyRules 放行 peerDep 冲突）
- TypeScript 6.x
- Vue 3.x + Vue Router 5.x + Naive UI 2.x
- Pinia 3.x 用于全局状态管理，可复用逻辑优先使用 Pinia store 或 Vue composable
- oxlint 用于代码检查，oxfmt 用于代码格式化
- tsx 用于执行 scripts 目录下的 TypeScript 脚本
- electron-builder 用于 Windows 打包

## 前端组件约定

- 所有组件使用 **PascalCase**（大驼峰）命名，包括自定义组件和 NaiveUI 组件
- NaiveUI 组件在使用处显式 import，确保 VSCode 类型提示
- View 组件（`views/`）仅做布局编排，不包含复杂业务逻辑
- 可复用的 UI 片段拆分为独立子组件（`components/`）
- 跨组件共享的状态使用 Pinia store（`stores/`）
- 可复用逻辑封装为 Vue composable（必要时）
- 全局 UI 状态（如面板显隐、侧边栏折叠）统一放在 Pinia store 中，不在组件内用 `ref` 管理
- 所有图标按钮（无文字仅图标）必须包裹 `NTooltip` 提供文字提示

## 项目约定

- 程序名为英文 `kuiper-box`，窗口标题为中文「柯伊伯方盒」
- GitHub 仓库：https://github.com/maanfa/kuiper
- 使用国内 npm 镜像加速依赖下载
- Electron 二进制缓存到 `.cache/electron` 目录
- 开发模式窗口标题追加 ` - [DevMode]` 标识
- `build` 命令用于页面构建（electron-vite build）
- `dist` 命令用于安装包构建（electron-builder），输出到 `release/win_unpacked`
- 清理命令：`pnpm clean`（构建产物）、`pnpm clean:out`（仅 out）、`pnpm clean:release`（仅 release）、`pnpm clean:cache`（electron 缓存）、`pnpm clean:all`（全部）
- Electron 打包输出命名格式：`KuiperBox-setup-win-x64-${version}.exe`
- 构建脚本统一放在 `scripts/` 目录，使用 `tsx` 执行
- 配置文件 `app.config.yml` 位于项目根目录（开发）或 exe 同目录（打包）
- Electron 二进制可能因 pnpm 构建脚本策略未自动下载，需在 `pnpm.onlyBuiltDependencies` 中明确列出 `electron`，或手动执行 `node node_modules/electron/install.js`
- 所有文件使用 LF 换行符
- VSCode 设置显式指定 TypeScript SDK 路径为 `node_modules/typescript/lib`

## 主进程特性

- 启动时关闭沙盒模式（`--no-sandbox`）
- 最小分辨率 1280x720
- 无菜单栏
- Ctrl+Shift+I / F12 打开 DevTools
- Ctrl+R 强制刷新页面
- 窗口关闭时自动保存位置和大小到 `app.config.yml`
- 启动时自动恢复上次窗口位置和大小

## 日志系统

- 使用项目内置的轻量封装 Logger（`src/main/logger.ts`），不引入社区日志包
- 同时输出到控制台 stdout 和日志文件
- 通过 `app.config.yml` 的 `logging` 配置控制日志级别和文件输出路径
- 日志文件按天滚动（`app-YYYY-MM-DD.log`）
- 编码统一使用 UTF-8，确保中文不乱码
- 打包模式下仅当 yml 中配置了 `logging.filePath` 时才输出日志文件

## 文件格式约定

- `.cztr` — 地形切片 SQLite 容器（tiles + metadata 两张表，z/x/y 主键）
- `.czts` — 3DTiles SQLite 容器（tiles + tilesets + metadata 三张表，uri 主键）
- 两种格式均可由文件查看器打开浏览，schema 详见 `skills/cztr-format/SKILL.md` / `skills/czts-format/SKILL.md`

## 任务系统

- `TaskType` 联合类型：`'pack'` | `'unpack'` | `'tileset-pack'` | `'tileset-unpack'`
- 所有任务通过 `TaskManager` 单例调度，使用 `BaseTask` → `TerrainPackTask` / `TerrainUnpackTask` / `TilesetPackTask` / `TilesetUnpackTask` 层次
- 任务事件（log/progress/complete）通过 IPC 推送到渲染进程，通道常量集中在 `shared/ipc-channels.ts`

## 组件命名规范

- 表单组件遵循 `<业务前缀><操作>Form` 模式：
  - `TerrainPackForm.vue` / `TerrainUnpackForm.vue` — 地形切片打包/解包
  - `TilesetPackForm.vue` / `TilesetUnpackForm.vue` — 3DTiles 打包/解包
- 工具类组件以功能描述命名：`FileInspectPanel.vue`、`FileTabsPanel.vue`、`LogOutput.vue`
- 配置面板组件遵循 `<业务>ConfigPanel` 模式：`ServerConfigPanel.vue`
- 对话框组件以 `Dialog` 后缀：`ClosePromptDialog.vue`、`ServerCloseDialog.vue`

## 前端工具函数

- `utils/file-inspector.ts` — 通用 SQLite 文件查看函数（openDbFile / queryDbTable / queryDbRow / fetchSummary / formatSize）
- `utils/tile-helper.ts` — 瓦片专用操作函数（queryTileInfo / saveTile / saveTileByUri）

## 主进程服务器模式

- 用 Hono 框架实现本地 HTTP 服务，挂载在 Electron 主进程
- 服务器类（`StaticServer`）仅管理生命周期和路由，HTML 模板抽取到 `html-templates.ts`
- SQLite 连接通过 `SqlitePool`（LRU 淘汰）管理，避免逐次开关
- 服务启停通过 IPC 通道（`server:start` / `server:stop` / `server:update-files` 等）控制
- 退出守卫：服务运行中关闭窗口时，主进程发 IPC 到渲染进程弹出 NaiveUI 确认弹窗，避免用系统原生对话框

## VerticalSplit 组件规范

- 分隔条为辅助视觉元素，宽度 4px，高度 10%（`align-self: center` 居中悬浮），圆角 2px
- 默认背景色 `#d9d9d9`（始终可见），hover 变为 `#36ad6a`
- 面板间距由分隔条的 `margin: 0 8px` 控制（共 20px），不使用 flex `gap`，以便精确匹配容器内边距
- 左右面板不设置 `overflow: hidden`，避免裁切子元素的圆角（如 border-radius 卡片）
- 分隔条容器（`.vertical-split`）设 `overflow: hidden` 防整体溢出
- 左侧面板 `flex-shrink: 0`，右侧面板 `flex: 1; min-width: 0`
- 拖拽逻辑扣除分隔条占宽（4 + 8×2 = 20px）后计算比例，左右最小宽度通过 `minLeftWidth` / `minRightWidth` props 控制（默认各 200px）
- 可选 `storageKey` prop，传入后自动将分隔位置持久化到 `localStorage`，刷新恢复

## Plan 输出规范

- Plan 仅包含**步骤列表**和**设计思路**，不输出具体 API 签名、代码片段、组件模板等实现细节
- 步骤列表标注操作类型（新建/修改）和所属层级（主进程/渲染/共享）
- 设计思路体现架构权衡、组件职责划分、数据流方向
- 实现细节（函数签名、props 定义、CSS 样式等）留到执行阶段按项目约定自行处理

## 沟通语言

- 所有文档、注释、交互均使用中文

## 用户文档

- `docs/` 目录存放面向最终用户的功能指引，以 Markdown 形式编写
- `skills/` 目录存放面向 AI 开发者的技术参考（schema、格式规范等）
- 本期功能指引：
  - `docs/static-server.md` — 静态托管服务使用指南（配置、API 端点、Cesium 集成、连接池说明）
