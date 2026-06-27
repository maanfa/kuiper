import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// 当前仅支持 Windows 构建
const platform = process.platform === 'win32' ? 'win' : process.platform
const arch = process.arch

// 先执行页面构建
execSync('electron-vite build', { stdio: 'inherit' })

// 解决 Windows 下 electron-builder 内部 shell 调用时路径含空格导致截断的问题
if (process.platform === 'win32') {
  const binDir = join(tmpdir(), 'kuiper-electron-builder-bin')
  mkdirSync(binDir, { recursive: true })

  writeFileSync(
    join(binDir, 'pnpm.cmd'),
    '@C:\\PROGRA~1\\Volta\\pnpm.exe %*',
    'utf-8',
  )

  process.env.PATH = `${binDir};${process.env.PATH}`
}

execSync('electron-builder --win', { stdio: 'inherit' })

// 嵌入 exe 图标（electron-builder 的 winCodeSign 提取在 Windows 普通权限下会失败）
execSync('tsx scripts/set-exe-icon.ts', { stdio: 'inherit' })

// 将解包目录打包为 7z 便携版
const root = resolve(import.meta.dirname!, '..')
const pkg = require(resolve(root, 'package.json'))
const version = pkg.version
const source = resolve(root, 'release', 'win-unpacked')
const outputName = `KuiperBox-portable-${platform}-${arch}-${version}.7z`
const output = resolve(root, 'release', outputName)

// 从 electron-builder 依赖的 7zip-bin 中获取 7za
const sevenZip = resolve(
  root,
  'node_modules',
  '.pnpm',
  '7zip-bin@5.2.0',
  'node_modules',
  '7zip-bin',
  'win',
  'x64',
  '7za.exe',
)

execSync(
  `"${sevenZip}" a -t7z -mx9 "${output}" "${source}\\*"`,
  { stdio: 'inherit' },
)

console.log(`便携版已生成: ${outputName}`)
