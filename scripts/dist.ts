import { execSync, execFileSync } from 'node:child_process'
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
  let pnpmPath = 'pnpm'
  try {
    pnpmPath = execSync('where pnpm', { encoding: 'utf-8' }).split('\n')[0].trim()
  } catch {
    // use default
  }

  if (pnpmPath.includes(' ')) {
    const binDir = join(tmpdir(), 'kuiper-electron-builder-bin')
    mkdirSync(binDir, { recursive: true })

    writeFileSync(
      join(binDir, 'pnpm.cmd'),
      `@"${pnpmPath}" %*`,
      'utf-8',
    )

    process.env.PATH = `${binDir};${process.env.PATH}`
  }
}

const root = resolve(import.meta.dirname!, '..')

// 仅生成解包目录（不生成安装包），以便在签名/打包前嵌入图标
execSync('electron-builder --win --dir --publish never', { stdio: 'inherit' })

// 嵌入 exe 图标（electron-builder 的 winCodeSign 提取在 Windows 普通权限下会失败）
execSync('tsx scripts/set-exe-icon.ts', { stdio: 'inherit' })

// 从已嵌入图标的解包目录生成 NSIS 安装包
execSync(
  `electron-builder --win --prepackaged "${resolve(root, 'release', 'win-unpacked')}" --publish never`,
  { stdio: 'inherit' },
)

// 将解包目录打包为 7z 便携版
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
