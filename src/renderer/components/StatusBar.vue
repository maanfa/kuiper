<template>
  <footer class="status-bar">
    <span>kuiper-box</span>
    <NTooltip trigger="hover" placement="top">
      <template #trigger>
        <NButton
          size="tiny"
          quaternary
          :type="active ? 'primary' : 'default'"
          @click="$emit('toggleSettings')"
        >
          <template #icon>
            <NIcon size="14" :color="active ? undefined : undefined">
              <SettingsOutline />
            </NIcon>
          </template>
        </NButton>
      </template>
      设置
    </NTooltip>
  </footer>
</template>

<script setup lang="ts">
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { SettingsOutline } from '@vicons/ionicons5'

defineProps<{
  active?: boolean
}>()

defineEmits<{
  toggleSettings: []
}>()
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
