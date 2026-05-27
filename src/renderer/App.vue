<template>
  <NConfigProvider :locale="zhCN" :theme="null">
    <RouterView />
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider } from 'naive-ui'
import { RouterView } from 'vue-router'
import { zhCN } from 'naive-ui'
</script>
