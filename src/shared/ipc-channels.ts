export const IPC = {
  // Task lifecycle
  TASK_START: 'task:start',
  TASK_CANCEL: 'task:cancel',

  // Main → Renderer pushes
  TASK_LOG: 'task:log',
  TASK_PROGRESS: 'task:progress',
  TASK_COMPLETE: 'task:complete',

  // Dialog
  DIALOG_OPEN_DIR: 'dialog:openDirectory',
  DIALOG_SAVE_FILE: 'dialog:saveFile',
  DIALOG_OPEN_FILE: 'dialog:openFile',
  DIALOG_SAVE_TEXT: 'dialog:saveText',

  // Shell
  SHELL_OPEN_PATH: 'shell:openPath',

  // Window control
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
} as const
