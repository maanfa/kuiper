# 柯伊伯方盒 (kuiper-box)

基于 Electron + Vue3 + Naive UI 构建的桌面应用程序，提供地形切片转换、3DTiles 转换及 SQLite 数据包浏览等地理信息数据处理工具。

## 功能

- **地形切片转换器** — 将 Cesium Quantized TerrainMesh 瓦片目录打包为 `.cztr` 容器，或从 `.cztr` 还原瓦片目录
- **3DTiles 转换器** — 将 3DTiles 数据集（tileset.json + 瓦片文件）打包为 `.czts` 容器，或从 `.czts` 还原数据集
- **文件查看器** — 打开并浏览 `.cztr` / `.czts` 文件，查看内部表数据、瓦片详情和 JSON 内容
- **地形切片生成器**（待实现）— TMS/WMTS 标准瓦片生成

## 技术栈

- **Electron** 42.x
- **electron-vite** 5.x
- **Vite** 8.x
- **TypeScript** 6.x
- **Vue** 3.x
- **Vue Router** 5.x
- **Naive UI** 2.x
- **pnpm** 10.x

## 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发模式
pnpm dev

# 代码检查（仅在需要时执行）
pnpm lint

# 代码格式化（仅在需要时执行）
pnpm fmt
```

## 构建

```bash
# 页面构建
pnpm build

# 安装包构建（输出到 release/win_unpacked）
pnpm dist
```

## 项目结构

```
kuiper/
├── src/
│   ├── main/         # Electron 主进程
│   ├── preload/      # 预加载脚本
│   ├── renderer/     # 渲染进程（Vue 前端）
│   │   ├── components/  # 通用组件（layout/form/tool/sidebar/dialog/settings）
│   │   ├── views/       # 页面视图
│   │   ├── stores/      # Pinia 全局状态
│   │   ├── router/      # 路由配置
│   │   └── utils/       # 工具函数
│   └── shared/       # 主进程/渲染进程共享模块
├── skills/           # 功能说明文档（skill 格式，各自独立目录 + SKILL.md）
├── scripts/          # 构建脚本
├── electron.vite.config.ts
├── electron-builder.yml
├── app.config.yml    # 应用配置文件
└── ...
```

## 工具文档

- [地形切片转换器](skills/terrain-tile-converter/SKILL.md) — 打包/解包 Cesium Quantized TerrainMesh 切片
- [3DTiles 转换器](skills/tileset-converter/SKILL.md)（待创建）— 打包/解包 3DTiles 数据集
- [文件查看器](skills/file-inspector/SKILL.md) — 浏览 .cztr / .czts 文件，查看表数据与瓦片详情
- [CZTR 文件格式](skills/cztr-format/SKILL.md) — .cztr 容器的 Schema 与校验规则
- [CZTS 文件格式](skills/czts-format/SKILL.md) — .czts 容器的 Schema、打包规则及与 CZTR 的对比

## 许可证

MIT
