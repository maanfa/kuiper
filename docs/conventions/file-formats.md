# 文件格式约定

- `.cztr` — 地形切片 SQLite 容器（tiles + metadata 两张表，z/x/y 主键）
- `.czts` — 3DTiles SQLite 容器（tiles + tilesets + metadata 三张表，uri 主键）
- 两种格式均可由文件查看器打开浏览，schema 详见 `skills/cztr-format/SKILL.md` / `skills/czts-format/SKILL.md`
