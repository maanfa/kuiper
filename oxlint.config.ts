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
  ],
})
