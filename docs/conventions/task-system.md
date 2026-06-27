# 任务系统

- `TaskType` 联合类型：`'pack'` | `'unpack'` | `'tileset-pack'` | `'tileset-unpack'` | `'terrain-gen'`
- 所有任务通过 `TaskManager` 单例调度，使用 `BaseTask` → `TerrainPackTask` / `TerrainUnpackTask` / `TilesetPackTask` / `TilesetUnpackTask` / `TerrainGenTask` 层次
- 任务事件（log/progress/complete）通过 IPC 推送到渲染进程，通道常量集中在 `shared/ipc-channels.ts`
- 任务列表变更通过 `task:list-changed` 通道实时推送，各 View 通过订阅获知变更
