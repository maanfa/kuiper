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
│   └── renderer/     # 渲染进程（Vue 前端）
├── scripts/          # 构建脚本
├── electron.vite.config.ts
├── electron-builder.yml
├── app.config.yml    # 应用配置文件
└── ...
```

## 配置说明

程序启动时会自动读取 `app.config.yml` 配置文件：

- 开发模式：读取项目根目录下的 `app.config.yml`
- 打包模式：读取可执行程序同目录下的 `app.config.yml`
- 文件不存在时使用默认配置

## 许可证

MIT
