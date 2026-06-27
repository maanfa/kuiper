<script setup lang="ts">
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { AppsOutline } from '@vicons/ionicons5'

defineProps<{
  statusText?: string
  flashText?: string
  floatPanelVisible?: boolean
}>()

defineEmits<{
  'toggle-float': []
}>()
</script>

<template>
  <footer class="status-bar">
    <span class="status-path">{{ statusText }}</span>
    <span class="status-spacer" />
    <NTooltip trigger="hover" placement="top">
      <template #trigger>
        <NButton
          size="tiny"
          quaternary
          :type="floatPanelVisible ? 'primary' : 'default'"
          class="status-bar-btn"
          @click="$emit('toggle-float')"
        >
          <template #icon>
            <NIcon size="14">
              <AppsOutline />
            </NIcon>
          </template>
        </NButton>
      </template>
      任务中心
    </NTooltip>
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

.status-spacer {
  flex: 1;
}

.status-bar-btn {
  width: 28px;
  height: 22px;
  padding: 0;
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
