import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

// electron-vite 构建配置，分别定义主进程、预加载脚本和渲染进程的构建参数
export default defineConfig({
  // 主进程构建
  main: {
    build: {
      outDir: 'out/main',
    },
  },
  // 预加载脚本构建（强制 CJS，Electron 不支持 ESM preload）
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
        external: ['electron'],
      },
    },
  },
  // 渲染进程（Vue 前端）构建
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: 'out/renderer',
    },
    resolve: {
      alias: {
        '@': resolve('src/renderer'), // 路径别名，@ 指向渲染进程根目录
      },
    },
    plugins: [vue()],
  },
})
