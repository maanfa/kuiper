import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'

/** env 条目 */
interface EnvEntry {
  _id: number
  key: string
  value: string
}

const envIdBase = Date.now()

/** 类型安全的 Electron API 访问器 */
const api = (window as unknown as { electronAPI: ElectronAPI }).electronAPI

export const useSettingsStore = defineStore('settings', () => {
  const configPath = ref('')
  const versions = ref<VersionInfo | null>(null)
  const saving = ref(false)
  const loaded = ref(false)

  /** 表单数据 */
  const form = reactive<{
    logging: { level: LogLevel, filePath?: string }
    env: EnvEntry[]
    closeBehavior: CloseBehavior
    terrainGen: { jdkPath: string, jarPath: string, javaOpts: string }
  }>({
    logging: { level: 'info' },
    env: [],
    closeBehavior: 'ask',
    terrainGen: { jdkPath: '', jarPath: '', javaOpts: '' },
  })

  // 防抖定时器
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  /** 防抖保存 */
  function debouncedSave(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => doSave(), 400)
  }

  // 表单变更自动保存（日志/环境变量使用防抖）
  watch(
    () => ({ level: form.logging.level, filePath: form.logging.filePath }),
    () => { if (loaded.value) debouncedSave() },
  )
  watch(
    () => form.env.map(e => `${e.key}=${e.value}`).join(','),
    () => { if (loaded.value) debouncedSave() },
  )

  // 关闭行为变更即时写入 yml，不等待防抖
  watch(
    () => form.closeBehavior,
    async (val) => {
      if (!loaded.value || !api) return
      const cfg = await api.getConfig()
      cfg.closeBehavior = val
      await api.saveConfig(cfg)
    },
  )

  // 地形生成器配置使用防抖
  watch(
    () => ({ jdkPath: form.terrainGen.jdkPath, jarPath: form.terrainGen.jarPath, javaOpts: form.terrainGen.javaOpts }),
    () => { if (loaded.value) debouncedSave() },
  )

  /** 从主进程加载配置 */
  async function loadConfig(): Promise<void> {
    if (!api) return
    loaded.value = false
    try {
      const cfg = await api.getConfig()
      configPath.value = await api.getConfigPath()

      form.logging.level = cfg.logging.level || 'info'
      form.logging.filePath = cfg.logging.filePath
      form.closeBehavior = cfg.closeBehavior || 'ask'

      if (cfg.env) {
        form.env = Object.entries(cfg.env).map(([key, value], i) => ({
          _id: envIdBase + i,
          key,
          value: value as string,
        }))
      } else {
        form.env = []
      }

      if (cfg.terrainGenerator) {
        form.terrainGen.jdkPath = cfg.terrainGenerator.jdkPath || ''
        form.terrainGen.jarPath = cfg.terrainGenerator.jarPath || ''
        form.terrainGen.javaOpts = cfg.terrainGenerator.javaOpts || ''
      }
    } catch (err) {
      console.error('加载配置失败:', err)
    }

    try {
      versions.value = await api.getVersions()
    } catch (err) {
      console.error('加载版本信息失败:', err)
      versions.value = null
    }
    loaded.value = true
  }

  /** 执行保存 */
  async function doSave(): Promise<void> {
    if (!api || saving.value) return
    saving.value = true
    try {
      const cfg = await api.getConfig()

      const env: Record<string, string> = {}
      for (const entry of form.env) {
        if (entry.key.trim()) {
          env[entry.key.trim()] = entry.value
        }
      }

      await api.saveConfig({
        ...cfg,
        logging: {
          level: form.logging.level,
          filePath: form.logging.filePath?.trim() || undefined,
        },
        env,
        terrainGenerator: {
          ...(cfg.terrainGenerator || { jdkPath: '', jarPath: '', jdkBuiltIn: false, jarBuiltIn: false }),
          jdkPath: form.terrainGen.jdkPath.trim(),
          jarPath: form.terrainGen.jarPath.trim(),
          javaOpts: form.terrainGen.javaOpts.trim() || undefined,
        },
      })
    } catch (err) {
      console.error('保存配置失败:', err)
    } finally {
      saving.value = false
    }
  }

  return {
    configPath,
    versions,
    saving,
    loaded,
    form,
    loadConfig,
    doSave,
  }
})
