# 项目约定

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
