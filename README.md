# 柯伊伯方盒 (kuiper-box)

基于 Electron + Vue3 + Naive UI 构建的桌面应用程序。

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
├── docs/wiki/        # 功能说明文档
├── scripts/          # 构建脚本
├── electron.vite.config.ts
├── electron-builder.yml
├── app.config.yml    # 应用配置文件
└── ...
```

## 工具文档

- [地形切片转换器](docs/wiki/terrain_tile_converter.md) —— 打包/解包 Cesium Quantized TerrainMesh 切片
- [文件查看器](docs/wiki/file_inspector.md) —— 浏览 .cztr 文件，查看瓦片索引、元数据及 layer.json 内容
- [CZTR 文件格式](docs/wiki/cztr_format.md) —— .cztr 容器文件的 Schema 与校验规则

## 许可证

MIT
