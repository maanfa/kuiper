# 项目约定

## 工程规范

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

## 文档约定

- 任何代码变更（新增、修改、删除）若影响功能行为、配置参数、API 接口或用户操作流程，须同步更新对应文档：
  - **功能文档** — 面向用户的使用指南，位于 `docs/`（如 `static-server.md`）
  - **架构文档** — 面向开发者的设计说明，位于 `skills/`（如 schema 规范、格式说明）
- 功能文档至少应包含：功能概述、配置参数说明、使用步骤、API 端点或输入输出格式
- README 功能列表需同步更新，与已实现功能保持一致
- `AGENTS.md` / `docs/conventions/` 中的约定文档应随项目演化持续维护
