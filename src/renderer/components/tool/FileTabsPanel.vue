<script setup lang="ts">
import { NTabs, NTabPane, NRadioGroup, NRadioButton, NInput } from 'naive-ui'
import SimpleTable from './SimpleTable.vue'

export interface OpenedFile {
  path: string
  name: string
  tables: string[]
  tileCount: number
  activeTable: string
  search: string
  columns: ({ title: string, key: string, width?: number, render?: (row: Record<string, unknown>) => unknown })[]
  rows: Record<string, unknown>[]
}

defineProps<{
  files: OpenedFile[]
  activeTabName: string
}>()

const emit = defineEmits<{
  'update:activeTabName': [value: string]
  tabClose: [path: string]
  tableChange: [value: string]
  search: [value: string]
  rowSelect: [row: Record<string, unknown>]
}>()

function radioLabel(tableName: string, file: OpenedFile): string {
  if (tableName === 'tiles' && file.tileCount > 0) {
    return `表 - ${tableName}（${file.tileCount}）`
  }
  return `表 - ${tableName}`
}

function getSearchPlaceholder(file: OpenedFile): string {
  if (file.columns.some((c) => c.key === 'uri')) {
    return '搜索 URI'
  }
  return '模糊搜索 z/x/y'
}
</script>

<template>
  <div class="left-panel">
    <NTabs
      :value="activeTabName"
      type="card"
      closable
      class="file-tabs"
      tab-style="min-width: 80px; padding: 8px 8px 8px 20px"
      @update:value="(v: string) => emit('update:activeTabName', v)"
      @close="(name: string) => emit('tabClose', name)"
    >
      <template #suffix>
        <slot name="suffix" />
      </template>
      <NTabPane
        v-for="file in files"
        :key="file.path"
        :name="file.path"
        :tab="file.name"
      >
        <div class="tab-body">
          <NRadioGroup
            :value="file.activeTable"
            name="table-view"
            class="radio-group"
            @update:value="(v: string) => { emit('tableChange', v) }"
          >
            <NRadioButton
              v-for="table in file.tables"
              :key="table"
              :value="table"
            >
              {{ radioLabel(table, file) }}
            </NRadioButton>
          </NRadioGroup>

          <NInput
            v-if="file.activeTable === 'tiles'"
            :value="file.search"
            :placeholder="getSearchPlaceholder(file)"
            clearable
            class="search-input"
            @update:value="(v: string) => { emit('search', v) }"
          />

          <div class="action-area" />

          <SimpleTable
            v-show="file.rows.length > 0"
            :columns="file.columns"
            :rows="file.rows"
            clickable
            class="data-table"
            @row-click="(row: Record<string, unknown>) => {
              const raw = { ...row }
              delete (raw as Record<string, unknown>).__row_idx
              emit('rowSelect', raw)
            }"
          />
        </div>
      </NTabPane>
    </NTabs>
    <div v-if="files.length === 0" class="empty-hint">
      请通过上方输入框打开文件
    </div>
  </div>
</template>

<style scoped>
.left-panel {
  position: relative;
  height: 100%;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.file-tabs {
  height: 100%;
}

.tab-body {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.radio-group {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.search-input {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.action-area {
  min-height: 8px;
  flex-shrink: 0;
}

.data-table {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.empty-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  font-size: 14px;
}
</style>
