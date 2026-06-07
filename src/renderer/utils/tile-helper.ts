/** 查询 cztr 瓦片信息（z/x/y 主键） */
export async function queryTileInfo(
  path: string,
  z: number,
  x: number,
  y: number,
): Promise<{ z: number, x: number, y: number, dataSize: number } | null> {
  try {
    return await window.electronAPI.cztrQueryTile(path, z, x, y)
  } catch {
    return null
  }
}

/** 保存 cztr 瓦片二进制数据（z/x/y 主键） */
export async function saveTile(
  path: string,
  z: number,
  x: number,
  y: number,
  destPath: string,
): Promise<boolean> {
  try {
    return await window.electronAPI.cztrSaveTile(path, z, x, y, destPath)
  } catch {
    return false
  }
}

/** 保存 czts 瓦片二进制数据（URI 主键） */
export async function saveTileByUri(
  path: string,
  uri: string,
  destPath: string,
): Promise<boolean> {
  try {
    return await window.electronAPI.cztrSaveTileByUri(path, uri, destPath)
  } catch {
    return false
  }
}
