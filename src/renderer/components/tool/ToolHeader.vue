<template>
  <div class="tool-header">
    <div class="tool-header-left">
      <slot name="title" />
    </div>
    <div class="tool-header-right">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.tool-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  min-width: 0;
}

.tool-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
