<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'

defineProps<{
  collapsed: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <div
    class="toggle-btn"
    :style="{ left: collapsed ? '64px' : '240px' }"
    @click="$emit('toggle')"
  >
    <NIcon size="12">
      <ChevronBackOutline v-if="!collapsed" />
      <ChevronForwardOutline v-else />
    </NIcon>
  </div>
</template>

<style scoped>
.toggle-btn {
  position: absolute;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 28px;
  background: #f5f5f5;
  border: 1px solid #eee;
  border-left: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  z-index: 10;
  transform: translateY(-50%);
  transition:
    left 0.25s ease,
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
  color: #bbb;
}

.toggle-btn:hover {
  background: #ebebeb;
  border-color: #d9d9d9;
  border-left: none;
  color: #777;
}

.toggle-btn::after {
  content: '';
  position: absolute;
  left: 0;
  top: -5000px;
  bottom: -5000px;
  width: 4px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.07), transparent);
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}

.toggle-btn:hover::after {
  opacity: 1;
}
</style>
