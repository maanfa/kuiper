import { resolve } from 'node:path'
import { rcedit } from 'rcedit'

const root = resolve(import.meta.dirname!, '..')
const exe = resolve(root, 'release', 'win-unpacked', 'kuiper-box.exe')
const icon = resolve(root, 'resources', 'icon.ico')

await rcedit(exe, { icon })

console.log('exe 图标已嵌入')
