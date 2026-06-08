<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { NScrollbar } from 'naive-ui'
import type { FunctionItem } from '../../stores/sidebar'
import { getToolGroups } from '../../../shared/tool-registry'
import FunctionCard from '../sidebar/FunctionCard.vue'
import FunctionIcon from '../sidebar/FunctionIcon.vue'
import kuiperRingIcon from '../../assets/KuiperRing.webp'

const props = defineProps<{
  activeRoute: string
  collapsed: boolean
  functionItems: FunctionItem[]
}>()

defineEmits<{
  navigate: [route: string]
}>()

const toolGroups = computed(() => getToolGroups(props.functionItems))
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
          <template v-for="(group, gi) in toolGroups" :key="group.key">
            <div class="sidebar-category-label" :class="{ first: gi === 0 }">
              {{ group.label }}
            </div>
            <FunctionCard
              v-for="item in group.items"
              :key="item.id"
              :icon="item.icon"
              :title="item.title"
              :description="item.description"
              :active="activeRoute === item.route"
              @click="$emit('navigate', item.route)"
            />
            <div
              v-if="gi < toolGroups.length - 1"
              class="sidebar-separator"
            />
          </template>
        </template>
        <template v-else>
          <template v-for="(group, gi) in toolGroups" :key="group.key">
            <FunctionIcon
              v-for="item in group.items"
              :key="item.id"
              :icon="item.icon"
              :title="item.title"
              :active="activeRoute === item.route"
              @click="$emit('navigate', item.route)"
            />
            <div
              v-if="gi < toolGroups.length - 1"
              class="sidebar-separator collapsed-separator"
            />
          </template>
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

.sidebar-category-label {
  font-size: 11px;
  color: #999;
  padding: 8px 12px 4px;
  font-weight: 500;
}

.sidebar-category-label.first {
  padding-top: 0;
}

.sidebar-separator {
  height: 1px;
  background: #e8e8e8;
  margin: 6px 16px;
}

.sidebar-separator.collapsed-separator {
  width: 32px;
  margin: 8px auto;
}
</style>
