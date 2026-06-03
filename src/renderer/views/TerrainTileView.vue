<template>
  <div class="generator-view">
    <ToolHeader>
      <template #title>地形切片生成器</template>
    </ToolHeader>

    <VerticalSplit
      :initial-ratio="0.45"
      :min-left-width="300"
      :min-right-width="600"
      class="generator-body"
    >
      <template #left>
        <div class="left-panel" />
      </template>
      <template #right>
        <LogOutput ref="logRef" />
      </template>
    </VerticalSplit>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolHeader from '../components/ToolHeader.vue'
import VerticalSplit from '../components/VerticalSplit.vue'
import LogOutput from '../components/LogOutput.vue'

const logRef = ref<InstanceType<typeof LogOutput> | null>(null)
</script>

<style scoped>
.generator-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.generator-body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  padding: 12px;
  background: #f5f5f5;
}

.left-panel {
  height: 100%;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}
</style>
