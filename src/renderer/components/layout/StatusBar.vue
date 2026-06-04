<script setup lang="ts">
defineProps<{
  statusText?: string
  flashText?: string
}>()
</script>

<template>
  <footer class="status-bar">
    <span class="status-path">{{ statusText }}</span>
    <span v-if="flashText" class="status-tag">{{ flashText }}</span>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 28px;
  background: #fafafa;
  border-top: 1px solid #e8e8e8;
  padding: 0 12px;
  font-size: 12px;
  flex-shrink: 0;
}

.status-path {
  color: #999;
}

.status-tag {
  color: #fff;
  background: #36ad6a;
  padding: 0 10px;
  height: 20px;
  line-height: 20px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
</style>
