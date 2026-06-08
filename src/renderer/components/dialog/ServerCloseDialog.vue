<script setup lang="ts">
import { NButton, NCard, NModal, NSpace } from 'naive-ui'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  confirm: []
  close: []
}>()
</script>

<template>
  <NModal
    :show="show"
    :mask-closable="false"
  >
    <NCard
      title="静态服务正在运行"
      style="width: 420px"
      closable
      @close="emit('close')"
    >
      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        静态文件托管服务尚未停止，退出程序将同时关闭服务。
      </p>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="emit('close')">
            取消
          </NButton>
          <NButton type="error" @click="emit('confirm')">
            停止服务并退出
          </NButton>
        </NSpace>
      </template>
    </NCard>
  </NModal>
</template>
