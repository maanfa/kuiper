# CZTR 文件格式

`.cztr` 为 SQLite 数据库容器文件，是柯伊伯方盒中地形切片打包/解包功能的中间格式。

## Schema

### 表结构

| 表名 | 列 | 类型 | 说明 |
|------|---|------|------|
| `tiles` | `z` | INTEGER | TMS 缩放级别 |
| `tiles` | `x` | INTEGER | 瓦片列号 |
| `tiles` | `y` | INTEGER | 瓦片行号 |
| `tiles` | `data` | BLOB | Quantized-Mesh 地形瓦片二进制数据 |
| `metadata` | `key` | TEXT | 元数据键名 |
| `metadata` | `value` | TEXT | 元数据值 |

### DDL

```sql
CREATE TABLE tiles (
  z     INTEGER NOT NULL,
  x     INTEGER NOT NULL,
  y     INTEGER NOT NULL,
  data  BLOB    NOT NULL,
  PRIMARY KEY (z, x, y)
) WITHOUT ROWID;

CREATE TABLE metadata (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

### metadata 键名

| key | 说明 |
|-----|------|
| `layer_json` | `layer.json` 文件全文 |
| `bounds` | 瓦片地理边界 `[west, south, east, north]` |
| `minzoom` | 最小缩放级别 |
| `maxzoom` | 最大缩放级别 |
| `tile_count` | 瓦片总数 |
| `format` | 数据格式（`quantized-mesh-1.0`） |
| `created_at` | 创建时间（ISO 8601） |
| `source_directory` | 打包源目录路径 |
| `layer_name` | 图层名称（`layer.json` 中 `name` 字段） |

## 校验规则

一个合法的 `.cztr` 文件必须满足：

1. 可用 SQLite 打开，无损坏
2. 包含 `tiles` 和 `metadata` 两张表
3. `tiles` 表包含 `z`、`x`、`y`、`data` 四列
4. `metadata` 表包含 `key`、`value` 两列
