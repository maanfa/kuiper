# VerticalSplit 组件规范

- 分隔条为辅助视觉元素，宽度 4px，高度 10%（`align-self: center` 居中悬浮），圆角 2px
- 默认背景色 `#d9d9d9`（始终可见），hover 变为 `#36ad6a`
- 面板间距由分隔条的 `margin: 0 8px` 控制（共 20px），不使用 flex `gap`，以便精确匹配容器内边距
- 左右面板不设置 `overflow: hidden`，避免裁切子元素的圆角（如 border-radius 卡片）
- 分隔条容器（`.vertical-split`）设 `overflow: hidden` 防整体溢出
- 左侧面板 `flex-shrink: 0`，右侧面板 `flex: 1; min-width: 0`
- 拖拽逻辑扣除分隔条占宽（4 + 8×2 = 20px）后计算比例，左右最小宽度通过 `minLeftWidth` / `minRightWidth` props 控制（默认各 200px）
- 可选 `storageKey` prop，传入后自动将分隔位置持久化到 `localStorage`，刷新恢复
