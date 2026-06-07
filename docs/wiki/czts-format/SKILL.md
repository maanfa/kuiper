# CZTS 文件格式

`.czts` 为 SQLite 数据库容器文件，是柯伊伯方盒中 3DTiles 打包/解包功能的中间格式。它将完整的 3DTiles 数据集（`tileset.json` + 二进制瓦片 + 外部 tileset）打包为单一文件。

## Schema

.czts 包含三张表：`tiles`（二进制瓦片）、`tilesets`（tileset JSON 文件）、`metadata`（元数据）。

### 表结构

**tiles 表** — 二进制瓦片

| 列 | 类型 | 说明 |
|----|------|------|
| `uri` | TEXT | 相对于根 tileset.json 所在目录的相对路径 |
| `data` | BLOB | 二进制瓦片原始数据（b3dm / i3dm / pnts / cmpt） |

**tilesets 表** — tileset JSON 文件（含外部 tileset）

| 列 | 类型 | 说明 |
|----|------|------|
| `uri` | TEXT | 相对于根 tileset.json 所在目录的相对路径 |
| `data` | TEXT | tileset JSON 文件的完整文本内容 |

**metadata 表** — 元数据

| 列 | 类型 | 说明 |
|----|------|------|
| `key` | TEXT | 元数据键名 |
| `value` | TEXT | 元数据值 |

### DDL

```sql
CREATE TABLE tiles (
  uri  TEXT PRIMARY KEY NOT NULL,
  data BLOB NOT NULL
) WITHOUT ROWID;

CREATE TABLE tilesets (
  uri  TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE metadata (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
```

### metadata 键名

| key | 说明 |
|-----|------|
| `root_tileset_json` | 根 `tileset.json` 文件全文 |
| `root_uri` | 根 `tileset.json` 的相对路径（通常为 `tileset.json`） |
| `binary_count` | 二进制瓦片总数 |
| `tileset_count` | tileset JSON 文件总数（含根 tileset） |
| `source_directory` | 打包源目录（根 tileset.json 所在目录的绝对路径） |
| `asset_version` | `tileset.asset.version` 字段值 |
| `created_at` | 创建时间（ISO 8601） |

## 打包规则

从 3DTiles 数据集生成 `.czts` 时遵循以下规则：

1. **递归遍历** — 从根 `tileset.json` 的 `root` 节点出发，深度优先遍历整个 tile 树
2. **二进制瓦片（b3dm / i3dm / pnts / cmpt）** — 按 `content.uri` 读取文件，以相对于根目录的路径为键存入 `tiles` 表
3. **外部 tileset（content.uri 指向 `.json`）** — 将 JSON 内容存入 `tilesets` 表，并递归遍历其 `root` 子树
4. **空瓦片** — 无 `content` 或 `content` 为空对象的 tile 不产生任何条目，仅继续遍历其 `children`
5. **data URI** — 跳过，不存储
6. **去重** — 同名 URI 仅存储一次

所有 URI 统一为正斜杠 `/` 分隔的相对路径格式。

## 校验规则

一个合法的 `.czts` 文件必须满足：

1. 可用 SQLite 打开，无损坏
2. 包含 `tiles`、`tilesets`、`metadata` 三张表
3. `tiles` 表包含 `uri`、`data` 两列
4. `tilesets` 表包含 `uri`、`data` 两列
5. `metadata` 表包含 `key`、`value` 两列

## 与 CZTR 的区分

| | CZTR | CZTS |
|---|------|------|
| 数据来源 | 地形瓦片目录（layer.json + .terrain） | 3DTiles 数据集（tileset.json + 瓦片文件） |
| tiles 表主键 | z / x / y（TMS 坐标） | uri（相对路径） |
| 额外表 | 无 | tilesets（外部 tileset JSON） |
| 二进制格式 | .terrain（Quantized-Mesh） | .b3dm / .i3dm / .pnts / .cmpt |
