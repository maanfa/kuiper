import { defineConfig } from 'oxlint'

// oxlint 配置：
// - correctness 类规则设为 error，保证代码正确性
// - suspicious 类规则设为 warn，辅助发现潜在问题
// - pedantic 和 style 关闭（由 oxfmt 负责风格问题）
export default defineConfig({
  categories: {
    correctness: 'error',
    suspicious: 'warn',
    pedantic: 'off',
    style: 'off',
  },
  rules: {},
  overrides: [
    {
      files: ['*.vue'],
      rules: {},
    },
    {
      // Node.js 后台代码使用了 worker_threads 的 parentPort.postMessage()，不是浏览器 window.postMessage，无需 targetOrigin 参数
      files: ['src/main/**/*.ts', 'scripts/**/*.ts'],
      rules: {
        'unicorn/require-post-message-target-origin': 'off',
      },
    },
  ],
})
