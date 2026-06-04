<script setup lang="ts">
defineProps<{
  statusText?: string
}>()
</script>

<template>
  <footer class="status-bar">
    <span>{{ statusText }}</span>
  </footer>
</template>

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
