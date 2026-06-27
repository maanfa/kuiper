import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { execFile } from 'node:child_process'

export interface JavaCheckResult {
  valid: boolean
  javaPath?: string
  version?: string
  error?: string
}

const JAVA_EXE = process.platform === 'win32' ? 'java.exe' : 'java'

/**
 * 递归扫描目录，查找 java 可执行文件
 * @param dir - 起始目录
 * @param maxDepth - 最大递归深度（默认 5）
 */
export function findJavaExe(dir: string, maxDepth = 5): string | null {
  if (!existsSync(dir)) return null

  function scan(currentDir: string, depth: number): string | null {
    if (depth > maxDepth) return null

    let entries: string[]
    try {
      entries = readdirSync(currentDir)
    } catch {
      return null
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry)
      let stat: ReturnType<typeof statSync>
      try {
        stat = statSync(fullPath)
      } catch {
        continue
      }

      if (stat.isFile() && entry.toLowerCase() === JAVA_EXE.toLowerCase()) {
        return fullPath
      }

      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        const found = scan(fullPath, depth + 1)
        if (found) return found
      }
    }
    return null
  }

  return scan(dir, 0)
}

/**
 * 执行 java -version 并解析版本号
 * 注意：java -version 输出到 stderr
 * @param javaPath - java 可执行文件路径
 */
export function checkJavaVersion(javaPath: string): Promise<JavaCheckResult> {
  return new Promise((resolve) => {
    // 检查文件是否存在
    const normalized = normalize(javaPath)
    if (!existsSync(normalized)) {
      resolve({ valid: false, error: `文件不存在: ${normalized}` })
      return
    }

    execFile(normalized, ['-version'], { timeout: 15_000 }, (err, _stdout, stderr) => {
      if (err && !stderr) {
        resolve({ valid: false, error: `无法执行: ${err.message}` })
        return
      }

      // java -version 输出在 stderr
      const output = stderr || ''
      const versionMatch = output.match(/version\s+"?(\d+)(?:\.(\d+))?/)

      if (!versionMatch) {
        resolve({ valid: false, error: `无法解析版本号，输出: ${output.substring(0, 200)}` })
        return
      }

      const major = parseInt(versionMatch[1], 10)
      const minor = versionMatch[2] ? parseInt(versionMatch[2], 10) : 0
      const version = versionMatch[0].replace(/version\s+"?/, '').replace('"', '')

      // JDK 17+ 的版本号格式：17.x, 21.x
      const versionNumber = major >= 9 ? major : minor

      if (versionNumber < 17) {
        resolve({ valid: false, version, error: `需要 JDK 17 或更高版本，当前: ${version}` })
        return
      }

      resolve({ valid: true, javaPath: normalized, version })
    })
  })
}

/**
 * 在系统 PATH 中查找 java
 */
export function findSystemJava(): string | null {
  // 用 java -version 试运行，依赖 PATH
  // 此处仅做存在性检查，更准确的路径可以通过 which/where 获取
  try {
    const { execSync } = require('node:child_process')
    const cmd = process.platform === 'win32' ? 'where java' : 'which java'
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 10_000 })
    const lines = result.trim().split('\n')
    if (lines.length > 0 && lines[0]) {
      const p = lines[0].trim()
      if (existsSync(p)) return p
    }
  } catch {
    // ignore
  }
  return null
}
