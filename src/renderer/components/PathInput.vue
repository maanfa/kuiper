<template>
  <div class="path-row">
    <NInput
      :value="modelValue"
      :placeholder="placeholder"
      :clearable="!disabled"
      :input-props="{ title: modelValue || undefined }"
      @update:value="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
    />
    <NTooltip trigger="hover">
      <template #trigger>
        <NButton :disabled="disabled || !modelValue" quaternary circle @click="handleOpen">
          <template #icon><NIcon :component="OpenOutline" /></template>
        </NButton>
      </template>
      {{ openTooltipText }}
    </NTooltip>
    <NTooltip trigger="hover">
      <template #trigger>
        <NButton :disabled="disabled" quaternary circle @click="handleSelect">
          <template #icon>
            <NIcon v-if="selectMode === 'dir'" :component="FolderOpenOutline" />
            <NIcon v-else-if="selectMode === 'file'" :component="DocumentOutline" />
            <NIcon v-else :component="SaveOutline" />
          </template>
        </NButton>
      </template>
      {{ selectTooltipText }}
    </NTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NInput, NButton, NIcon, NTooltip } from 'naive-ui'
import { FolderOpenOutline, DocumentOutline, SaveOutline, OpenOutline } from '@vicons/ionicons5'
import { useUiStore } from '../stores/ui'

const uiStore = useUiStore()

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder: string
    disabled?: boolean
    openMode?: 'dir' | 'parent'
    selectMode?: 'dir' | 'file' | 'save'
    selectFilters?: { name: string, extensions: string[] }[]
    saveDefaultName?: string
    openTooltip?: string
    selectTooltip?: string
  }>(),
  {
    disabled: false,
    openMode: 'dir',
    selectMode: 'dir',
    selectFilters: undefined,
    saveDefaultName: '',
    openTooltip: undefined,
    selectTooltip: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const openTooltipText = computed(() => {
  if (props.openTooltip) return props.openTooltip
  return props.openMode === 'parent' ? '打开所在目录' : '打开此目录'
})

const selectTooltipText = computed(() => {
  if (props.selectTooltip) return props.selectTooltip
  switch (props.selectMode) {
    case 'file': return '选择文件'
    case 'save': return '选择保存位置'
    default: return '选择目录'
  }
})

function handleOpen() {
  if (!props.modelValue) return
  if (props.openMode === 'parent') {
    const parent = props.modelValue.replace(/[/\\][^/\\]*$/, '')
    if (parent) window.electronAPI.openPath(parent)
  } else {
    window.electronAPI.openPath(props.modelValue)
  }
}

function handleInput(value: string) {
  emit('update:modelValue', value)
}

function handleFocus() {
  uiStore.setStatusText(props.modelValue)
}

function handleBlur() {
  uiStore.clearStatusText()
}

async function handleSelect() {
  switch (props.selectMode) {
    case 'file': {
      const path = await window.electronAPI.openFile(
        props.selectFilters || [{ name: '全部文件', extensions: ['*'] }],
      )
      if (path) emit('update:modelValue', path)
      break
    }
    case 'save': {
      const path = await window.electronAPI.saveFile(
        props.saveDefaultName || '',
      )
      if (path) emit('update:modelValue', path)
      break
    }
    case 'dir':
    default: {
      const dir = await window.electronAPI.openDirectory()
      if (dir) emit('update:modelValue', dir)
      break
    }
  }
}
</script>

<style scoped>
.path-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.path-row :deep(.n-input) {
  flex: 1;
}
</style>
