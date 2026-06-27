# 日志系统

- 使用项目内置的轻量封装 Logger（`src/main/logger.ts`），不引入社区日志包
- 同时输出到控制台 stdout 和日志文件
- 通过 `app.config.yml` 的 `logging` 配置控制日志级别和文件输出路径
- 日志文件按天滚动（`app-YYYY-MM-DD.log`）
- 编码统一使用 UTF-8，确保中文不乱码
- 打包模式下仅当 yml 中配置了 `logging.filePath` 时才输出日志文件
