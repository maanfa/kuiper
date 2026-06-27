# 组件命名规范

- 表单组件遵循 `<业务前缀><操作>Form` 模式：
  - `TerrainPackForm.vue` / `TerrainUnpackForm.vue` — 地形切片打包/解包
  - `TilesetPackForm.vue` / `TilesetUnpackForm.vue` — 3DTiles 打包/解包
- 工具类组件以功能描述命名：`FileInspectPanel.vue`、`FileTabsPanel.vue`、`LogOutput.vue`
- 配置面板组件遵循 `<业务>ConfigPanel` 模式：`ServerConfigPanel.vue`
- 对话框组件以 `Dialog` 后缀：`ClosePromptDialog.vue`、`ServerCloseDialog.vue`
