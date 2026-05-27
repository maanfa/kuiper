<template>
  <aside class="sidebar" :class="{ collapsed: store.collapsed }">
    <RouterLink to="/" class="sidebar-home">
      <NIcon size="28" :depth="activeRoute === '/' ? 1 : 3">
        <HomeOutline />
      </NIcon>
    </RouterLink>

    <NScrollbar class="sidebar-scroll">
      <div class="sidebar-items">
        <template v-if="!store.collapsed">
          <FunctionCard
            v-for="item in store.functionItems"
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
            v-for="item in store.functionItems"
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

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { NIcon, NScrollbar } from 'naive-ui'
import { HomeOutline } from '@vicons/ionicons5'
import { useSidebarStore } from '../stores/sidebar'
import FunctionCard from './FunctionCard.vue'
import FunctionIcon from './FunctionIcon.vue'

defineProps<{
  activeRoute: string
}>()

defineEmits<{
  navigate: [route: string]
}>()

const store = useSidebarStore()
</script>

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
  height: 56px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s;
}

.sidebar-home:hover {
  background: #f5f5f5;
}

.sidebar-scroll {
  flex: 1;
  overflow: hidden;
}

.sidebar-items {
  padding: 8px;
}
</style>
