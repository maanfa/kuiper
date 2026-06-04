<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { NScrollbar } from 'naive-ui'
import type { FunctionItem } from '../../stores/sidebar'
import FunctionCard from '../sidebar/FunctionCard.vue'
import FunctionIcon from '../sidebar/FunctionIcon.vue'
import kuiperRingIcon from '../../assets/KuiperRing.webp'

defineProps<{
  activeRoute: string
  collapsed: boolean
  functionItems: FunctionItem[]
}>()

defineEmits<{
  navigate: [route: string]
}>()
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <RouterLink to="/" class="sidebar-home">
      <img
        :src="kuiperRingIcon"
        alt="Home"
        class="sidebar-home-icon"
        :class="{ active: activeRoute === '/' }"
      />
    </RouterLink>

    <NScrollbar class="sidebar-scroll">
      <div class="sidebar-items">
        <template v-if="!collapsed">
          <FunctionCard
            v-for="item in functionItems"
            :key="item.id"
            :icon="item.icon"
            :title="item.title"
            :description="item.description"
            :active="activeRoute === item.route"
            @click="$emit('navigate', item.route)"
          />
        </template>
        <template v-else>
          <FunctionIcon
            v-for="item in functionItems"
            :key="item.id"
            :icon="item.icon"
            :title="item.title"
            :active="activeRoute === item.route"
            @click="$emit('navigate', item.route)"
          />
        </template>
      </div>
    </NScrollbar>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  transition: width 0.25s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-home {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s, height 0.25s ease;
}

.sidebar.collapsed .sidebar-home {
  height: 56px;
}

.sidebar-home:hover {
  background: #f5f5f5;
}

.sidebar-home-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  opacity: 0.6;
  transform: scale(2);
  transition: opacity 0.15s, transform 0.25s ease;
}

.sidebar.collapsed .sidebar-home-icon {
  transform: scale(1);
}

.sidebar-home-icon.active {
  opacity: 1;
}

.sidebar-home:hover .sidebar-home-icon {
  opacity: 0.9;
}

.sidebar-scroll {
  flex: 1;
  overflow: hidden;
}

.sidebar-items {
  padding: 8px;
}
</style>
