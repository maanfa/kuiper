<script setup lang="ts">
import { NIcon, NTooltip } from 'naive-ui'
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  active: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <NTooltip trigger="hover" placement="right">
    <template #trigger>
      <div
        class="function-icon"
        :class="{ active }"
        @click="$emit('click')"
      >
        <NIcon size="24"><Component :is="icon" /></NIcon>
      </div>
    </template>
    {{ title }}
  </NTooltip>
</template>

<style scoped>
.function-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  color: #666;
}

.function-icon:hover {
  background: #f0f0f0;
}

.function-icon.active {
  background: #e6f0ff;
  color: #2080f0;
}
</style>
