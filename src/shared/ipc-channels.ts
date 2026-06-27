export const IPC = {
  // Task lifecycle
  TASK_START: 'task:start',
  TASK_CANCEL: 'task:cancel',

  // Main → Renderer pushes
  TASK_LOG: 'task:log',
  TASK_PROGRESS: 'task:progress',
  TASK_COMPLETE: 'task:complete',
  TASK_LIST: 'task:list',

  // Static server
  SERVER_START: 'server:start',
  SERVER_STOP: 'server:stop',
  SERVER_STATUS: 'server:status',
  SERVER_LOG: 'server:log',
  SERVER_UPDATE_FILES: 'server:update-files',
  SERVER_POOL_STATUS: 'server:pool-status',
  SERVER_CLOSE_PROMPT: 'server:close-prompt',
  SERVER_CLOSE_RESULT: 'server:close-result',

  // Static file server
  STATIC_FILE_SERVER_START: 'static-file-server:start',
  STATIC_FILE_SERVER_STOP: 'static-file-server:stop',
  STATIC_FILE_SERVER_STATUS: 'static-file-server:status',
  STATIC_FILE_SERVER_LOG: 'static-file-server:log',
  STATIC_FILE_SERVER_CLOSE_PROMPT: 'static-file-server:close-prompt',
  STATIC_FILE_SERVER_CLOSE_RESULT: 'static-file-server:close-result',

  // Dialog
  DIALOG_OPEN_DIR: 'dialog:openDirectory',
  DIALOG_SAVE_FILE: 'dialog:saveFile',
  DIALOG_OPEN_FILE: 'dialog:openFile',
  DIALOG_SAVE_TEXT: 'dialog:saveText',

  // Shell
  SHELL_OPEN_PATH: 'shell:openPath',
  SHELL_OPEN_EXTERNAL: 'shell:openExternal',

  // Window control
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',

  // Terrain Generator
  TERRAIN_GEN_DOWNLOAD_JDK: 'terrain-gen:download-jdk',
  TERRAIN_GEN_DOWNLOAD_JAR: 'terrain-gen:download-jar',
  TERRAIN_GEN_DOWNLOAD_PROGRESS: 'terrain-gen:download-progress',
  TERRAIN_GEN_DOWNLOAD_COMPLETE: 'terrain-gen:download-complete',
  TERRAIN_GEN_CHECK_JAVA: 'terrain-gen:check-java',

  // CZTR Inspector
  CZTR_OPEN: 'cztr:open',
  CZTR_QUERY: 'cztr:query',
  CZTR_QUERY_ROW: 'cztr:query-row',
  CZTR_QUERY_TILE: 'cztr:query-tile',
  CZTR_SAVE_TILE: 'cztr:save-tile',
  CZTR_SAVE_TILE_BY_URI: 'cztr:save-tile-by-uri',
  CZTR_SUMMARY: 'cztr:summary',
} as const
