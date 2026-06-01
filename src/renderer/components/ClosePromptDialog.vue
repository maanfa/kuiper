<template>
  <NModal
    :show="show"
    :mask-closable="false"
  >
    <NCard
      title="请选择需要执行的操作"
      style="width: 360px"
      closable
      @close="emit('close')"
    >
      <NCheckbox v-model:checked="remember">
        不再提示
      </NCheckbox>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="onAction('exit')">
            退出程序
          </NButton>
          <NButton type="primary" @click="onAction('hide')">
            隐藏到任务栏
          </NButton>
        </NSpace>
      </template>
    </NCard>
  </NModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NCard, NCheckbox, NModal, NSpace } from 'naive-ui'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  confirm: [result: CloseResult]
  close: []
}>()

const remember = ref(false)

function onAction(action: 'exit' | 'hide'): void {
  emit('confirm', { action, remember: remember.value })
  remember.value = false
}
</script>

<style scoped>
</style>
