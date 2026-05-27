import { rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname!, '..')

const targets: Record<string, string[]> = {
  out: [resolve(projectRoot, 'out')],
  release: [resolve(projectRoot, 'release')],
  'electron-cache': [resolve(projectRoot, '.cache', 'electron')],
  'builder-cache': [join(process.env.LOCALAPPDATA!, 'electron-builder', 'Cache')],
}

// 清理前端构建产物
function cleanOut(): void {
  for (const dir of targets.out) {
    rmSync(dir, { recursive: true, force: true })
    console.log(`已删除: ${dir}`)
  }
}

// 清理安装包输出
function cleanRelease(): void {
  for (const dir of targets.release) {
    rmSync(dir, { recursive: true, force: true })
    console.log(`已删除: ${dir}`)
  }
}

// 清理 Electron 二进制缓存
function cleanElectronCache(): void {
  for (const dir of targets['electron-cache']) {
    rmSync(dir, { recursive: true, force: true })
    console.log(`已删除: ${dir}`)
  }
}

// 清理 electron-builder 下载缓存
function cleanBuilderCache(): void {
  for (const dir of targets['builder-cache']) {
    rmSync(dir, { recursive: true, force: true })
    console.log(`已删除: ${dir}`)
  }
}

const arg = process.argv[2] || 'build'

switch (arg) {
  case 'out':
    cleanOut()
    break
  case 'release':
    cleanRelease()
    break
  case 'electron-cache':
    cleanElectronCache()
    break
  case 'builder-cache':
    cleanBuilderCache()
    break
  case 'build':
    cleanOut()
    cleanRelease()
    break
  case 'cache':
    cleanElectronCache()
    cleanBuilderCache()
    break
  case 'all':
    cleanOut()
    cleanRelease()
    cleanElectronCache()
    cleanBuilderCache()
    break
  default:
    console.log(`用法: tsx scripts/clean.ts [out|release|electron-cache|builder-cache|build|cache|all]`)
    console.log(`  out             清理前端构建产物 (out/)`)
    console.log(`  release         清理安装包输出 (release/)`)
    console.log(`  electron-cache  清理 Electron 二进制缓存`)
    console.log(`  builder-cache   清理 electron-builder 下载缓存`)
    console.log(`  build           清理 out + release（默认）`)
    console.log(`  cache           清理 electron-cache + builder-cache`)
    console.log(`  all             清理全部`)
}
