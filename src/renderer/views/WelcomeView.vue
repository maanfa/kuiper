<template>
  <div class="welcome">
    <NH1>欢迎使用柯伊伯方盒</NH1>
    <NText depth="3">请从左侧选择功能开始使用</NText>
  </div>
</template>

<script setup lang="ts">
import { NH1, NText } from 'naive-ui'
</script>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}
</style>
