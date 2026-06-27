import { resolve } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

/** 在输出目录 package.json 合并 "type": "commonjs"，保留 electron-vite 原生的 "main" 等字段 */
function cjsOverridePlugin(): Plugin {
  let resolvedOutDir = ''
  return {
    name: 'cjs-override',
    configResolved(config) {
      resolvedOutDir = config.build.outDir
    },
    writeBundle() {
      if (!resolvedOutDir) return
      const pkgPath = resolve(resolvedOutDir, 'package.json')
      let pkg: Record<string, unknown> = {}
      try {
        pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      } catch {
        // 文件不存在则创建
      }
      pkg.type = 'commonjs'
      writeFileSync(pkgPath, JSON.stringify(pkg), 'utf-8')
    },
  }
}

/** 屏蔽 Rolldown 对 vueuse 等第三方包中位置不当的 #__PURE__ 注释产生的 [INVALID_ANNOTATION] 警告 */
function suppressInvalidAnnotation() {
  return (...args: unknown[]) => {
    const [level, log, handler] = args as [string, { code?: string }, (level: unknown, log: unknown) => void]
    if (log.code === 'INVALID_ANNOTATION') return
    handler(level, log)
  }
}

// electron-vite 构建配置，分别定义主进程、预加载脚本和渲染进程的构建参数
export default defineConfig({
  // 主进程构建
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          'task/tile-worker': resolve('src/main/task/tile-worker.ts'),
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
        },
        external: ['electron', 'electron-builder'],
        onLog: suppressInvalidAnnotation(),
      },
    },
    plugins: [cjsOverridePlugin()],
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
        onLog: suppressInvalidAnnotation(),
      },
    },
    plugins: [cjsOverridePlugin()],
  },
  // 渲染进程（Vue 前端）构建
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: resolve('src/renderer/index.html'),
        onLog: suppressInvalidAnnotation(),
      },
    },
    resolve: {
      alias: {
        '@': resolve('src/renderer'), // 路径别名，@ 指向渲染进程根目录
      },
    },
    plugins: [vue()],
  },
})
