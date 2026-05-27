import { execSync } from 'node:child_process'

// 执行 electron-vite 页面构建（main + preload + renderer）
execSync('electron-vite build', { stdio: 'inherit' })
