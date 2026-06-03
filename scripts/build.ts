import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// 执行 electron-vite 页面构建（main + preload + renderer）
execSync('electron-vite build', { stdio: 'inherit' })

// 由于 package.json 声明了 "type": "module"，为 CJS 输出目录注入 type 覆盖声明
function ensureCjsOverride(dir: string): void {
  mkdirSync(dir, { recursive: true })
  const pkgPath = resolve(dir, 'package.json')
  let pkg: Record<string, unknown> = {}
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    } catch {
      // ignore
    }
  }
  pkg.type = 'commonjs'
  writeFileSync(pkgPath, JSON.stringify(pkg), 'utf-8')
}

ensureCjsOverride('out/main')
ensureCjsOverride('out/preload')
