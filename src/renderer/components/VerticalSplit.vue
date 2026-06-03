<template>
  <div ref="containerRef" class="vertical-split">
    <div class="split-left" :style="{ width: leftRatio * 100 + '%' }">
      <slot name="left" />
    </div>
    <div
      class="split-divider"
      @mousedown="onDividerDragStart"
    />
    <div class="split-right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  initialRatio?: number
  minLeftWidth?: number
  minRightWidth?: number
}>(), {
  initialRatio: 0.5,
  minLeftWidth: 200,
  minRightWidth: 200,
})

const emit = defineEmits<{
  'update:leftRatio': [ratio: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
const leftRatio = ref(props.initialRatio)

function onDividerDragStart(e: MouseEvent) {
  e.preventDefault()
  const container = containerRef.value
  if (!container) return

  const rect = container.getBoundingClientRect()
  const total = rect.width
  const dividerSpace = 20 // width(4px) + margin-left(8px) + margin-right(8px)
  const usable = total - dividerSpace
  const minLeftRatio = Math.min(props.minLeftWidth / usable, 1)
  const minRightRatio = Math.min(props.minRightWidth / usable, 1)
  const maxLeftRatio = 1 - minRightRatio

  function onMove(ev: MouseEvent) {
    const newRatio = (ev.clientX - rect.left) / usable
    leftRatio.value = Math.max(minLeftRatio, Math.min(maxLeftRatio, newRatio))
    emit('update:leftRatio', leftRatio.value)
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.vertical-split {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 0;
}

.split-left {
  flex-shrink: 0;
}

.split-divider {
  width: 4px;
  height: 10%;
  align-self: center;
  margin: 0 8px;
  background: #d9d9d9;
  border-radius: 2px;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.15s;
}

.split-divider:hover {
  background: #36ad6a;
}

.split-right {
  flex: 1;
  overflow: hidden;
}
</style>
