<template>
  <div
    class="function-card"
    :class="{ active }"
    @click="$emit('click')"
  >
    <NIcon size="20" class="card-icon"><Component :is="icon" /></NIcon>
    <span class="card-title">{{ title }}</span>
    <NPopover trigger="click" placement="right" :width="280">
      <template #trigger>
        <NIcon size="13" class="info-icon">
          <InformationCircleOutline />
        </NIcon>
      </template>
      <div class="popover-desc">{{ description }}</div>
    </NPopover>
  </div>
</template>

<script setup lang="ts">
import { NIcon, NPopover } from 'naive-ui'
import { InformationCircleOutline } from '@vicons/ionicons5'
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description: string
  active: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.function-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 2px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.function-card:hover {
  background: #f0f0f0;
}

.function-card.active {
  background: #e6f0ff;
}

.card-icon {
  flex-shrink: 0;
  color: #666;
}

.card-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.info-icon {
  flex-shrink: 0;
  color: #ccc;
  cursor: help;
  transition: color 0.15s;
}

.function-card:hover .info-icon {
  color: #aaa;
}

.popover-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #555;
}
</style>
