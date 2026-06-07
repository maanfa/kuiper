<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { NForm, NFormItem, NButton, NAlert } from 'naive-ui'
import PathInput from '../form/PathInput.vue'
import { useUiStore } from '../../stores/ui'

const uiStore = useUiStore()

const props = defineProps<{
  disabled?: boolean
  running?: boolean
}>()

const emit = defineEmits<{
  tilesetPackStart: [params: TilesetPackParams & { workerCount: number }]
}>()

const tilesetJsonPath = useStorage('tilesetPack-jsonPath', '')
const outputFile = useStorage('tilesetPack-outputFile', '')

const jsonFilter = [{ name: 'tileset.json', extensions: ['json'] as string[] }]

const canStart = computed(() => tilesetJsonPath.value && outputFile.value)

const isUncPath = computed(() =>
  tilesetJsonPath.value.startsWith('\\\\') || tilesetJsonPath.value.startsWith('//') ||
  outputFile.value.startsWith('\\\\') || outputFile.value.startsWith('//')
)

const saveDefaultName = computed(() => {
  const dir = tilesetJsonPath.value.replace(/[/\\][^/\\]*$/, '')
  const name = dir.split(/[/\\]/).pop() || 'tileset'
  return dir ? `${dir}\\${name}.czts` : `${name}.czts`
})

function handleJsonPathChange(path: string) {
  const dir = path.replace(/[/\\][^/\\]*$/, '')
  const name = dir.split(/[/\\]/).pop() || 'tileset'
  outputFile.value = dir ? `${dir}\\${name}.czts` : `${name}.czts`
}

async function startPack(): Promise<void> {
  const cfg = await window.electronAPI.getConfig()
  emit('tilesetPackStart', {
    tilesetJsonPath: tilesetJsonPath.value,
    outputFile: outputFile.value,
    workerCount: cfg.task.workerCount,
  })
}
</script>

<template>
  <div class="pack-form">
    <div class="form-fields">
      <NForm label-placement="top" size="medium">
        <NFormItem label="tileset.json" required>
          <PathInput
            v-model="tilesetJsonPath"
            placeholder="选择 tileset.json 文件"
            select-mode="file"
            :select-filters="jsonFilter"
            @update:model-value="handleJsonPathChange"
            @focus="(v: string) => uiStore.setStatusText(v)"
            @blur="uiStore.clearStatusText()"
          />
        </NFormItem>
        <NFormItem label="输出文件" required>
          <PathInput
            v-model="outputFile"
            placeholder="选择 .czts 文件保存位置"
            open-mode="parent"
            select-mode="save"
            :save-default-name="saveDefaultName"
            :select-filters="[{ name: 'CZTS 3DTiles 包', extensions: ['czts'] }]"
            @focus="(v: string) => uiStore.setStatusText(v)"
            @blur="uiStore.clearStatusText()"
          />
        </NFormItem>
        <NAlert
          v-if="isUncPath"
          type="warning"
          title="检测到网络路径"
          :bordered="false"
          class="unc-warning"
        >
          输入或输出位于 SMB/UNC 网络路径。网络延迟可能引起界面短暂卡顿。
        </NAlert>
      </NForm>
    </div>
    <div class="form-submit">
      <NButton
        type="primary"
        :loading="running"
        :disabled="disabled || !canStart"
        @click="startPack"
      >
        {{ running ? '处理中...' : '提交' }}
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.pack-form {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.form-fields {
  flex: 1;
  overflow-y: auto;
}

.form-submit {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  flex-shrink: 0;
}

.unc-warning {
  margin-bottom: 12px;
}
</style>
