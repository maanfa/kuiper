<template>
  <NConfigProvider :locale="zhCN" :theme-overrides="themeOverrides">
    <RouterView />
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, zhCN } from 'naive-ui'
import { RouterView } from 'vue-router'

const themeOverrides = {
  common: {
    fontFamily: "'Noto Sans SC', sans-serif",
  },
}
</script>
