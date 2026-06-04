<script setup lang="ts">
export interface SimpleColumn {
  title: string
  key: string
  width?: number
}

defineProps<{
  columns: SimpleColumn[]
  rows: Record<string, unknown>[]
  clickable?: boolean
}>()

defineEmits<{
  rowClick: [row: Record<string, unknown>, index: number]
}>()

function cellText(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
}
</script>

<template>
  <div class="simple-table-wrapper">
    <table class="simple-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? { width: col.width + 'px' } : undefined"
          >
            {{ col.title }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, i) in rows"
          :key="i"
          :class="clickable !== false ? 'table-row' : undefined"
          @click="clickable !== false ? $emit('rowClick', row, i) : undefined"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :title="cellText(row[col.key])"
          >
            {{ cellText(row[col.key]) }}
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length" class="empty-cell">暂无数据</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.simple-table-wrapper {
  flex: 1;
  overflow: auto;
  min-height: 0;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
}

.simple-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 13px;
}

.simple-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.simple-table th {
  background: rgba(248, 250, 252, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 9px 14px;
  text-align: left;
  font-weight: 600;
  color: #37474f;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 12.5px;
  letter-spacing: 0.3px;
}

.simple-table th:first-child {
  border-top-left-radius: 7px;
}

.simple-table th:last-child {
  border-top-right-radius: 7px;
}

.simple-table td {
  padding: 7px 14px;
  border-bottom: 1px solid #f0f0f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #555;
}

.table-row {
  cursor: pointer;
  transition: background 0.15s;
}

.table-row:hover {
  background: #ecf9f2;
}

.empty-cell {
  text-align: center;
  color: #ccc;
  padding: 32px 14px;
  cursor: default;
}
</style>
