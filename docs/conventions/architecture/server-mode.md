# 主进程服务器模式

- 用 Hono 框架实现本地 HTTP 服务，挂载在 Electron 主进程
- 服务器类（`StaticServer` / `StaticFileServer`）仅管理生命周期和路由，HTML 模板抽取到 `html-templates.ts`
- SQLite 连接通过 `SqlitePool`（LRU 淘汰）管理，避免逐次开关（仅 `StaticServer` 使用）
- 服务启停通过 IPC 通道（`server:start` / `server:stop` / `server:update-files` 等）控制
- 退出守卫：服务运行中关闭窗口时，主进程发 IPC 到渲染进程弹出 NaiveUI 确认弹窗，避免用系统原生对话框
- 服务状态变更通过 `server:status-changed` / `static-file-server:status-changed` 主动推送
