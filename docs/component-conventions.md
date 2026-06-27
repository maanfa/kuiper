# 前端组件约定

- 所有组件使用 **PascalCase**（大驼峰）命名，包括自定义组件和 NaiveUI 组件
- NaiveUI 组件在使用处显式 import，确保 VSCode 类型提示
- View 组件（`views/`）仅做布局编排，不包含复杂业务逻辑
- 可复用的 UI 片段拆分为独立子组件（`components/`）
- 跨组件共享的状态使用 Pinia store（`stores/`）
- 可复用逻辑封装为 Vue composable（必要时）
- 全局 UI 状态（如面板显隐、侧边栏折叠）统一放在 Pinia store 中，不在组件内用 `ref` 管理
- 所有图标按钮（无文字仅图标）必须包裹 `NTooltip` 提供文字提示
