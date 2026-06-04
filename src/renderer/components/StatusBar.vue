<template>
  <footer class="status-bar">
    <span>{{ uiStore.statusText }}</span>
  </footer>
</template>

<script setup lang="ts">
import { useUiStore } from '../stores/ui'

const uiStore = useUiStore()
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  height: 28px;
  line-height: 28px;
  background: #fafafa;
  border-top: 1px solid #e8e8e8;
  padding: 0 12px;
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}
</style>
