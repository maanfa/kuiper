/** 打开并校验一个 SQLite 数据包文件（.cztr / .czts），返回结构化的校验结果 */
export async function openDbFile(path: string): Promise<CztrOpenResult> {
  try {
    const result = await window.electronAPI.cztrOpen(path)
    return { valid: result.valid, error: result.error, tables: result.tables, tileCount: result.tileCount }
  } catch (err) {
    return { valid: false, error: `打开文件失败: ${(err as Error).message}`, tables: [], tileCount: 0 }
  }
}

/** 查询指定文件的某个表数据 */
export async function queryDbTable(
  path: string,
  tableName: string,
  search?: string,
): Promise<CztrQueryResult> {
  try {
    return await window.electronAPI.cztrQuery(path, tableName, search)
  } catch (err) {
    return { columns: [], rows: [], error: (err as Error).message }
  }
}

/** 查询单行完整数据（不截断），用于 inspect panel */
export async function queryDbRow(
  path: string,
  tableName: string,
  whereCol: string,
  whereVal: unknown,
): Promise<Record<string, unknown> | null> {
  try {
    return await window.electronAPI.cztrQueryRow(path, tableName, whereCol, whereVal)
  } catch {
    return null
  }
}

/** 获取文件概要信息 */
export async function fetchSummary(path: string): Promise<CztrSummary | null> {
  try {
    return await window.electronAPI.cztrSummary(path)
  } catch {
    return null
  }
}

/** 格式化文件大小为可读字符串 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
