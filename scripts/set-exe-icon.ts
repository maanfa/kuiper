import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname!, '..')
const exe = resolve(root, 'release', 'win-unpacked', 'kuiper-box.exe')
const icon = resolve(root, 'resources', 'icon.ico')
const rcedit = resolve(root, 'vendor', 'rcedit-x64.exe')

execSync(`"${rcedit}" "${exe}" --set-icon "${icon}"`, { stdio: 'inherit' })

console.log('exe 图标已嵌入')
