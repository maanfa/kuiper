import { app, BrowserWindow, Tray, nativeImage, Menu, ipcMain, dialog, shell } from 'electron'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import {
  loadAppConfig,
  saveAppConfig,
  getCenteredBounds,
  getConfigPath,
} from './config'
import type { AppConfig, CloseBehavior } from './config'
import { Logger } from './logger'
import { TaskManager } from './task/TaskManager'
import { IPC } from '../shared/ipc-channels'
import type { ServerConfig, ServerFileEntry, ServerLogEntry } from '../shared/server-types'
import { openCztr, queryCztr, queryCztrRow, queryCztrTile, saveCztrTile, saveTileByUri, getCztrSummary } from './cztr-inspector'
import { StaticServer } from './server/StaticServer'

// 修复 Windows 控制台编码，确保中文日志正常显示
if (process.platform === 'win32') {
  spawnSync('chcp', ['65001'], { stdio: 'ignore' })
}

/** 主窗口实例 */
let win: BrowserWindow | null = null
/** 任务栏托盘实例 */
let tray: Tray | null = null
/** 全局日志实例 */
let logger: Logger | null = null
/** 是否强制退出（用于跳过关闭拦截） */
let forceQuit = false
/** 静态文件服务器实例 */
let staticServer: StaticServer | null = null

/**
 * 获取应用图标文件的绝对路径
 *
 * - 开发模式：相对于项目根目录的 resources/icon.png
 * - 打包模式：相对于 exe 目录的 resources/icon.png
 */
function getIconPath(): string {
  return app.isPackaged
    ? join(dirname(app.getPath('exe')), 'resources', 'icon.png')
    : join(app.getAppPath(), 'resources', 'icon.png')
}

/**
 * 获取日志输出目录的绝对路径
 *
 * - 已配置 filePath：相对于应用根目录或 exe 目录解析
 * - 打包模式未配置：默认使用 exe 旁边的 logs 目录
 * - 开发模式未配置：不输出日志文件
 */
function getLogDir(cfg: AppConfig): string {
  if (cfg.logging.filePath) {
    const baseDir = app.isPackaged
      ? dirname(app.getPath('exe'))
      : app.getAppPath()
    return join(baseDir, cfg.logging.filePath)
  }
  if (app.isPackaged) {
    return join(dirname(app.getPath('exe')), 'logs')
  }
  return ''
}

/**
 * 创建主窗口
 *
 * 读取配置恢复窗口状态，注册快捷键（F12/Ctrl+Shift+I 打开 DevTools，
 * Ctrl+R 强制刷新），监听关闭事件保存窗口位置。
 */
function createWindow(cfg: AppConfig): void {
  // 首次启动时自动居中
  const bounds = getCenteredBounds(cfg.windowBounds)

  // 开发模式窗口标题追加标识
  const title = app.isPackaged ? '柯伊伯方盒' : '柯伊伯方盒 - [DevMode]'

  win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 1280,
    minHeight: 720,
    frame: false,
    title,
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 监听最大化/还原事件，推送给渲染进程
  win.on('maximize', () => { win?.webContents.send('window:maximize-changed', true) })
  win.on('unmaximize', () => { win?.webContents.send('window:maximize-changed', false) })

  // 移除默认菜单栏
  Menu.setApplicationMenu(null)

  // 阻止页面 <title> 覆盖窗口标题
  win.webContents.on('page-title-updated', (event) => {
    event.preventDefault()
  })

  // 页面加载完成后显式设置标题，确保 DevMode 后缀生效
  win.webContents.on('did-finish-load', () => {
    win?.setTitle(title)
  })

  // 将窗口注册到 TaskManager
  TaskManager.getInstance().setWindow(win)

  // 注册开发快捷键（仅开发模式生效，打包后禁用）
  win.webContents.on('before-input-event', (_event, input) => {
    if (app.isPackaged) return
    // F12 或 Ctrl+Shift+I 打开/关闭 DevTools
    if (
      input.key === 'F12' ||
      (input.control && input.shift && input.key.toLowerCase() === 'i')
    ) {
      win?.webContents.toggleDevTools()
    }
    // Ctrl+R 强制刷新页面（忽略缓存）
    if (input.control && input.key.toLowerCase() === 'r') {
      win?.webContents.reloadIgnoringCache()
    }
  })

  // 恢复窗口全屏/最大化状态
  if (cfg.isFullScreen) {
    win.setFullScreen(true)
  } else if (cfg.isMaximized) {
    win.maximize()
  }

  // 窗口尺寸变更时即时写回配置文件（500ms 防抖）
  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  win.on('resize', () => {
    if (!win) return
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const curBounds = win!.getBounds()
      const freshCfg = loadAppConfig()
      freshCfg.windowBounds = { width: curBounds.width, height: curBounds.height }
      saveAppConfig(freshCfg)
      resizeTimer = null
    }, 500)
  })

  // 关闭窗口时检查关闭行为配置
  win.on('close', (e) => {
    if (!win || forceQuit) return

    // 若静态服务正在运行，二次确认
    if (staticServer?.getStatus() === 'running') {
      e.preventDefault()
      win.webContents.send(IPC.SERVER_CLOSE_PROMPT)
      return
    }

    const curCfg = loadAppConfig()
    // 仅保存上次正常窗口的宽高，位置由启动时自动居中计算
    const currentBounds = win.getBounds()
    const isMaximized = win.isMaximized()
    const isFullScreen = win.isFullScreen()
    if (!isFullScreen && !isMaximized) {
      curCfg.windowBounds = {
        width: currentBounds.width,
        height: currentBounds.height,
      }
    }
    curCfg.isFullScreen = isFullScreen
    curCfg.isMaximized = isMaximized
    saveAppConfig(curCfg)

    if (curCfg.closeBehavior === 'exit') return
    if (curCfg.closeBehavior === 'hide') {
      e.preventDefault()
      win.hide()
      return
    }
    // closeBehavior === 'ask'
    e.preventDefault()
    win.webContents.send('close:prompt')
  })

  // 根据运行模式加载不同入口
  if (app.isPackaged) {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  } else {
    win.loadURL(process.env.ELECTRON_RENDERER_URL!)
  }

  logger?.info('窗口创建完成')
}

/**
 * 创建系统任务栏托盘
 *
 * 单击无响应，双击恢复/显示主窗口，右键弹出上下文菜单。
 */
function createTray(): void {
  const icon = nativeImage.createFromPath(getIconPath()).resize({ width: 32, height: 32 })
  tray = new Tray(icon)
  tray.setToolTip(app.isPackaged ? '柯伊伯方盒' : '柯伊伯方盒 - [DevMode]')

  tray.on('double-click', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    if (!win.isVisible()) win.show()
    win.focus()
  })

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主界面',
      click: () => {
        if (!win) return
        if (win.isMinimized()) win.restore()
        if (!win.isVisible()) win.show()
        win.focus()
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        forceQuit = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)
}

/** 保存服务端配置到 app.config.yml */
function saveServerConfig(config: ServerConfig): void {
  const cfg = loadAppConfig()
  cfg.server = config
  saveAppConfig(cfg)
}

/** 注册 IPC 处理器，供渲染进程读写配置 */
function registerIpcHandlers(): void {
  const taskManager = TaskManager.getInstance()

  ipcMain.handle('config:get', () => loadAppConfig())

  ipcMain.handle('config:save', (_event, config: AppConfig) => {
    saveAppConfig(config)
  })

  ipcMain.handle('config:path', () => getConfigPath())

  ipcMain.handle('config:versions', () => {
    const vers = {
      app: app.getVersion() || '0.0.0',
      electron: process.versions.electron || '',
      node: process.versions.node || '',
      chrome: process.versions.chrome || '',
      v8: process.versions.v8 || '',
    }
    logger?.info('返回版本信息', JSON.stringify(vers))
    return vers
  })

  ipcMain.on(
    'close:result',
    (_event, data: { action: 'exit' | 'hide', remember: boolean }) => {
      if (data.remember) {
        const cfg = loadAppConfig()
        cfg.closeBehavior = data.action as CloseBehavior
        saveAppConfig(cfg)
      }
      if (data.action === 'exit') {
        forceQuit = true
        app.quit()
      } else {
        setTimeout(() => win?.hide(), 0)
      }
    },
  )

  ipcMain.on(
    IPC.SERVER_CLOSE_RESULT,
    (_event, confirmed: boolean) => {
      if (confirmed) {
        staticServer?.stop()
        staticServer = null
        forceQuit = true
        app.quit()
      }
    },
  )

  // Task API
  ipcMain.handle(IPC.TASK_START, (_event, config) => {
    return taskManager.start(config)
  })

  ipcMain.handle(IPC.TASK_CANCEL, (_event, taskId: string) => {
    return taskManager.cancel(taskId)
  })

  // Server API
  ipcMain.handle(IPC.SERVER_START, async (_event, config: ServerConfig) => {
    try {
      if (!staticServer) {
        staticServer = new StaticServer()
      }
      await staticServer.start(config, (entry: ServerLogEntry) => {
        win?.webContents.send(IPC.SERVER_LOG, entry)
      })
      saveServerConfig(config)
      logger?.info(`静态服务已启动，端口 ${config.port}`)
      return { success: true }
    } catch (err) {
      logger?.error('启动静态服务失败:', (err as Error).message)
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.SERVER_STOP, async () => {
    try {
      staticServer?.stop()
      staticServer = null
      logger?.info('静态服务已停止')
      return { success: true }
    } catch (err) {
      logger?.error('停止静态服务失败:', (err as Error).message)
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.SERVER_STATUS, () => {
    return staticServer?.getStatus() ?? 'stopped'
  })

  ipcMain.handle(IPC.SERVER_UPDATE_FILES, (_event, files: ServerFileEntry[]) => {
    staticServer?.updateFiles(files)
    const cfg = loadAppConfig()
    if (cfg.server) {
      cfg.server.files = files
      saveAppConfig(cfg)
    }
  })

  ipcMain.handle(IPC.SERVER_POOL_STATUS, () => {
    return staticServer?.getPoolStatus() ?? null
  })

  // Dialog API
  ipcMain.handle(IPC.DIALOG_OPEN_DIR, async () => {
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.DIALOG_SAVE_FILE, async (_event, defaultName: string, filters?: { name: string, extensions: string[] }[]) => {
    if (!win) return null
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: filters || [{ name: '所有文件', extensions: ['*'] }],
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle(IPC.DIALOG_OPEN_FILE, async (_event, filters: { name: string, extensions: string[] }[]) => {
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters,
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.DIALOG_SAVE_TEXT, async (_event, content: string, defaultName: string) => {
    if (!win) return false
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [{ name: '文本文件', extensions: ['txt', 'log'] }],
    })
    if (result.canceled || !result.filePath) return false
    try {
      writeFileSync(result.filePath, content, 'utf-8')
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC.SHELL_OPEN_PATH, (_event, targetPath: string) => {
    shell.openPath(targetPath)
  })

  ipcMain.handle(IPC.SHELL_OPEN_EXTERNAL, (_event, url: string) => {
    shell.openExternal(url)
  })

  // 窗口控制
  ipcMain.handle(IPC.WINDOW_MINIMIZE, () => win?.minimize())
  ipcMain.handle(IPC.WINDOW_MAXIMIZE, () => {
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.handle(IPC.WINDOW_CLOSE, () => win?.close())
  ipcMain.handle(IPC.WINDOW_IS_MAXIMIZED, () => win?.isMaximized() ?? false)

  // CZTR Inspector
  ipcMain.handle(IPC.CZTR_OPEN, (_event, filePath: string) => {
    return openCztr(filePath)
  })

  ipcMain.handle(IPC.CZTR_QUERY, (_event, filePath: string, tableName: string, search?: string) => {
    try {
      return queryCztr(filePath, tableName, search)
    } catch (err) {
      return { columns: [], rows: [], error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.CZTR_QUERY_ROW, (_event, filePath: string, tableName: string, whereCol: string, whereVal: unknown) => {
    return queryCztrRow(filePath, tableName, whereCol, whereVal)
  })

  ipcMain.handle(IPC.CZTR_QUERY_TILE, (_event, filePath: string, z: number, x: number, y: number) => {
    return queryCztrTile(filePath, z, x, y)
  })

  ipcMain.handle(IPC.CZTR_SAVE_TILE, (_event, filePath: string, z: number, x: number, y: number, destPath: string) => {
    return saveCztrTile(filePath, z, x, y, destPath)
  })

  ipcMain.handle(IPC.CZTR_SAVE_TILE_BY_URI, (_event, filePath: string, uri: string, destPath: string) => {
    return saveTileByUri(filePath, uri, destPath)
  })

  ipcMain.handle(IPC.CZTR_SUMMARY, (_event, filePath: string) => {
    return getCztrSummary(filePath)
  })

  ipcMain.handle('app:isPackaged', () => app.isPackaged)
}

// 关闭 Electron 沙盒模式
app.commandLine.appendSwitch('no-sandbox')

// 等待应用就绪后尽早加载配置并初始化日志，再创建窗口
app.whenReady().then(() => {
  const cfg = loadAppConfig()

  // 注入环境变量到 process.env
  if (cfg.env) {
    for (const [key, value] of Object.entries(cfg.env)) {
      process.env[key] = value
    }
  }

  logger = new Logger(cfg.logging, getLogDir(cfg))
  logger.info('kuiper-box 启动')

  registerIpcHandlers()
  createWindow(cfg)
  createTray()
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 退出前清理
app.on('before-quit', () => {
  staticServer?.stop()
  staticServer = null
  forceQuit = true
})
