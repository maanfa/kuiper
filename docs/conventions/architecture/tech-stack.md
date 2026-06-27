# 技术栈

- pnpm 作为包管理器
- Electron 42.x + electron-vite 5.x
- Vite 8.x（通过 pnpm.peerDependencyRules 放行 peerDep 冲突）
- TypeScript 6.x
- Vue 3.x + Vue Router 5.x + Naive UI 2.x
- Pinia 3.x 用于全局状态管理，可复用逻辑优先使用 Pinia store 或 Vue composable
- oxlint 用于代码检查，oxfmt 用于代码格式化
- tsx 用于执行 scripts 目录下的 TypeScript 脚本
- electron-builder 用于 Windows 打包
