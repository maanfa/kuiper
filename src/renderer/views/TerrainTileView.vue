<template>
  <div class="terrain-tile">
    <NH2>地形切片工具</NH2>
    <NText depth="2">支持全球高程数据的多级切片处理，可高效生成 TMS/WMTS 标准瓦片，适用于 Cesium、Mapbox 等三维地球引擎的地形渲染场景。</NText>
    <NDivider />
    <NText depth="3">功能开发中，敬请期待。</NText>
  </div>
</template>

<script setup lang="ts">
import { NH2, NText, NDivider } from 'naive-ui'
</script>

<style scoped>
.terrain-tile {
  padding: 32px;
  max-width: 720px;
}
</style>
