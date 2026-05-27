<template>
  <div class="env-var-form">
    <div
      v-for="(entry, index) in modelValue"
      :key="entry._id"
      class="env-row"
    >
      <NInput
        v-model:value="entry.key"
        placeholder="键名"
        size="small"
        class="env-input"
      />
      <NInput
        v-model:value="entry.value"
        placeholder="值"
        size="small"
        class="env-input"
      />
      <NButton
        size="small"
        type="error"
        quaternary
        @click="removeEntry(index)"
      >
        <template #icon>
          <NIcon><TrashOutline /></NIcon>
        </template>
      </NButton>
    </div>
    <NButton
      size="small"
      quaternary
      type="primary"
      @click.stop="addEntry"
    >
      <template #icon>
        <NIcon><AddOutline /></NIcon>
      </template>
      添加环境变量
    </NButton>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NInput } from 'naive-ui'
import { AddOutline, TrashOutline } from '@vicons/ionicons5'

interface EnvEntry {
  _id: number
  key: string
  value: string
}

const props = defineProps<{
  modelValue: EnvEntry[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EnvEntry[]]
}>()

let nextId = 0

function addEntry(): void {
  emit('update:modelValue', [
    ...props.modelValue,
    { _id: nextId++, key: '', value: '' },
  ])
}

function removeEntry(index: number): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}
</script>

<style scoped>
.env-var-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.env-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.env-input {
  flex: 1;
  min-width: 0;
}
</style>
