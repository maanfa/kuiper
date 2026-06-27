import { createWriteStream, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { net } from 'electron'
import { spawnSync } from 'node:child_process'
import { findJavaExe } from './java-check'

/** Microsoft JDK 21 Windows x64 下载地址 */
export const MS_JDK21_URL = 'https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip'

/** mago-3d-terrainer 1.13.0 jar 下载地址 */
export const MAGO_JAR_URL = 'https://github.com/Gaia3D/mago-3d-terrainer/releases/download/v1.13.0-release/mago-3d-terrainer-1.13.0-release.jar'

/** jar 文件名 */
export const MAGO_JAR_NAME = 'mago-3d-terrainer-1.13.0-release.jar'

/** GitHub releases 页面 */
export const MAGO_RELEASES_URL = 'https://github.com/Gaia3D/mago-3d-terrainer/releases'

export interface DownloadResult {
  success: boolean
  path?: string
  error?: string
}

/**
 * 通用流式下载，使用 Electron net 模块（自动遵循系统代理）
 *
 * 相较于 Node.js https 模块的优势：
 * 1. 自动遵循 Windows Internet Options / HTTPS_PROXY 系统代理设置
 * 2. 自动处理重定向（net.fetch 默认跟随）
 * 3. 支持 ReadableStream 进度跟踪
 *
 * @param url - 下载地址
 * @param destPath - 目标文件完整路径
 * @param onProgress - 进度回调 (receivedBytes, totalBytes)
 */
async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (received: number, total: number) => void,
): Promise<DownloadResult> {
  const destDir = destPath.substring(
    0,
    destPath.lastIndexOf('\\') !== -1 ? destPath.lastIndexOf('\\') : destPath.lastIndexOf('/'),
  )
  if (destDir && !existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  const tmpPath = destPath + '.tmp'
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 1_800_000) // 30 分钟超时

  try {
    // 使用 Electron net.fetch，自动遵循系统代理和重定向
    const response = await net.fetch(url, {
      signal: controller.signal,
    })

    if (!response.ok) {
      clearTimeout(timeoutId)
      return { success: false, error: `HTTP ${response.status}: ${response.statusText || '下载失败'}` }
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
    const body = response.body
    if (!body) {
      clearTimeout(timeoutId)
      return { success: false, error: '响应体为空' }
    }

    const reader = body.getReader()
    const file = createWriteStream(tmpPath)
    let received = 0
    let done = false

    while (!done) {
      const chunk = await reader.read()
      done = chunk.done
      if (chunk.value) {
        received += chunk.value.length
        file.write(chunk.value)
        onProgress?.(received, contentLength || received)
      }
    }

    clearTimeout(timeoutId)
    file.end()

    await new Promise<void>((resolveFile, rejectFile) => {
      file.on('finish', resolveFile)
      file.on('error', rejectFile)
    })

    try {
      renameSync(tmpPath, destPath)
      return { success: true, path: destPath }
    } catch (err) {
      return { success: false, error: `文件移动失败: ${(err as Error).message}` }
    }
  } catch (err) {
    clearTimeout(timeoutId)
    try { unlinkSync(tmpPath) } catch { /* ignore */ }

    if ((err as Error).name === 'AbortError') {
      return { success: false, error: '下载超时（30 分钟）' }
    }
    return { success: false, error: `下载失败: ${(err as Error).message}` }
  }
}

/**
 * 下载 Microsoft JDK 21 并解压到 resources 目录
 * @param resourcesDir - resources 目录绝对路径
 * @param onProgress - 进度回调
 */
export async function downloadJdk(
  resourcesDir: string,
  onProgress?: (received: number, total: number) => void,
): Promise<DownloadResult> {
  const zipPath = join(resourcesDir, 'microsoft-jdk-21.zip')

  // 检查是否已有解压好的 JDK
  const existingJdk = findJavaExe(resourcesDir)
  if (existingJdk) {
    return { success: true, path: existingJdk }
  }

  // 下载 zip
  const dlResult = await downloadFile(MS_JDK21_URL, zipPath, onProgress)
  if (!dlResult.success) {
    return dlResult
  }

  // 解压
  try {
    const result = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${resourcesDir}" -Force`,
    ], { timeout: 300_000 })

    // 删除 zip
    try { unlinkSync(zipPath) } catch { /* ignore */ }

    if (result.status !== 0 && result.error) {
      return { success: false, error: `解压失败: ${result.error.message}` }
    }

    // 找 java.exe
    const javaPath = findJavaExe(resourcesDir)
    if (!javaPath) {
      return { success: false, error: '解压完成但未找到 java.exe，请检查下载内容' }
    }

    return { success: true, path: javaPath }
  } catch (err) {
    return { success: false, error: `解压过程异常: ${(err as Error).message}` }
  }
}

/**
 * 下载 mago-3d-terrainer jar 到 resources 目录
 * @param resourcesDir - resources 目录绝对路径
 * @param onProgress - 进度回调
 */
export async function downloadJar(
  resourcesDir: string,
  onProgress?: (received: number, total: number) => void,
): Promise<DownloadResult> {
  const jarPath = join(resourcesDir, MAGO_JAR_NAME)

  // 检查是否已有
  if (existsSync(jarPath)) {
    return { success: true, path: jarPath }
  }

  return downloadFile(MAGO_JAR_URL, jarPath, onProgress)
}
