<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import {
  NForm,
  NFormItem,
  NButton,
  NIcon,
  NInputNumber,
  NInput,
  NCheckbox,
  NSelect,
  NDivider,
  NTooltip,
} from 'naive-ui'
import { PlayOutline, ChevronDownOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import PathInput from '../form/PathInput.vue'

const props = defineProps<{
  disabled?: boolean
  running?: boolean
}>()

const emit = defineEmits<{
  genStart: [params: TerrainGenParams]
}>()

// 基础参数 — localStorage 缓存
const tifDir = useStorage('terrain-gen-tifDir', '')
const outputDir = useStorage('terrain-gen-outputDir', '')
const minZoom = useStorage('terrain-gen-minZoom', 0)
const maxZoom = useStorage('terrain-gen-maxZoom', 14)

// 高级参数 — 本地 ref，不缓存
const showAdvanced = ref(false)
const advGeoid = ref('')
const advIntensity = ref<number | null>(null)
const advInterpolationType = ref<('nearest' | 'bilinear') | null>(null)
const advCalculateNormals = ref(false)
const advMosaicSize = ref<number | null>(null)
const advRasterMaxSize = ref<number | null>(null)
const advBody = ref<('earth' | 'moon') | null>(null)
const advDebug = ref(false)
const advLeaveTemp = ref(false)
const advContinue = ref(false)
const advSkipStandardizationResize = ref(false)
const advExtraArgs = ref('')

const interpolationOptions = [
  { label: 'bilinear（默认）', value: 'bilinear' },
  { label: 'nearest', value: 'nearest' },
]

const bodyOptions = [
  { label: 'earth（默认）', value: 'earth' },
  { label: 'moon', value: 'moon' },
]

const canStart = computed(() =>
  tifDir.value && outputDir.value && !props.disabled && !props.running,
)

function buildAdvanced(): TerrainGenAdvancedParams | undefined {
  const adv: TerrainGenAdvancedParams = {}
  let hasValue = false

  if (advGeoid.value.trim()) { adv.geoid = advGeoid.value.trim(); hasValue = true }
  if (advIntensity.value != null) { adv.intensity = advIntensity.value; hasValue = true }
  if (advInterpolationType.value) { adv.interpolationType = advInterpolationType.value; hasValue = true }
  if (advCalculateNormals.value) { adv.calculateNormals = true; hasValue = true }
  if (advMosaicSize.value != null) { adv.mosaicSize = advMosaicSize.value; hasValue = true }
  if (advRasterMaxSize.value != null) { adv.rasterMaxSize = advRasterMaxSize.value; hasValue = true }
  if (advBody.value) { adv.body = advBody.value; hasValue = true }
  if (advDebug.value) { adv.debug = true; hasValue = true }
  if (advLeaveTemp.value) { adv.leaveTemp = true; hasValue = true }
  if (advContinue.value) { adv.continueFlag = true; hasValue = true }
  if (advSkipStandardizationResize.value) { adv.skipStandardizationResize = true; hasValue = true }
  if (advExtraArgs.value.trim()) { adv.extraArgs = advExtraArgs.value.trim(); hasValue = true }

  return hasValue ? adv : undefined
}

async function startGen(): Promise<void> {
  if (!canStart.value) return

  const cfg = await window.electronAPI.getConfig()
  const jdkPath = cfg.terrainGenerator?.jdkPath || ''
  const jarPath = cfg.terrainGenerator?.jarPath || ''

  emit('genStart', {
    tifDir: tifDir.value,
    outputDir: outputDir.value,
    minZoom: minZoom.value,
    maxZoom: maxZoom.value,
    jdkPath,
    jarPath,
    advanced: buildAdvanced(),
  })
}
</script>

<template>
  <div class="gen-form">
    <div class="form-scroll">
      <NForm label-placement="top" size="medium">
        <NFormItem label="TIF 输入目录" required>
          <PathInput
            v-model="tifDir"
            placeholder="选择包含 GeoTIFF 的目录"
            :disabled="disabled"
            open-mode="dir"
            select-mode="dir"
            open-tooltip="在文件管理器中打开"
            select-tooltip="选择 TIF 目录"
          />
        </NFormItem>

        <NFormItem label="地形输出目录" required>
          <PathInput
            v-model="outputDir"
            placeholder="选择地形瓦片输出目录"
            :disabled="disabled"
            open-mode="dir"
            select-mode="dir"
            open-tooltip="在文件管理器中打开"
            select-tooltip="选择输出目录"
          />
        </NFormItem>

        <div class="zoom-row">
          <NFormItem label="最小层级">
            <NInputNumber
              v-model:value="minZoom"
              :min="0"
              :max="22"
              :disabled="disabled"
              :style="{ width: '100%' }"
            />
          </NFormItem>

          <NFormItem label="最大层级">
            <NInputNumber
              v-model:value="maxZoom"
              :min="0"
              :max="22"
              :disabled="disabled"
              :style="{ width: '100%' }"
            />
          </NFormItem>
        </div>

        <!-- 高级参数折叠区 -->
        <div class="advanced-toggle">
          <NTooltip placement="top">
            <template #trigger>
              <NButton
                text
                size="small"
                @click="showAdvanced = !showAdvanced"
              >
                <template #icon>
                  <NIcon size="14">
                    <ChevronDownOutline v-if="showAdvanced" />
                    <ChevronForwardOutline v-else />
                  </NIcon>
                </template>
                高级参数
              </NButton>
            </template>
            --geoid / --intensity / --interpolationType 等可选参数
          </NTooltip>
        </div>

        <template v-if="showAdvanced">
          <NDivider style="margin: 8px 0" />

          <NFormItem label="高度参考 (--geoid)">
            <NInput
              v-model:value="advGeoid"
              placeholder="Ellipsoid / EGM96 / GeoTIFF 文件路径"
              :disabled="disabled"
            />
          </NFormItem>

          <NFormItem label="网格细化强度 (--intensity)">
            <NInputNumber
              v-model:value="advIntensity"
              :min="0"
              :step="0.5"
              placeholder="默认 4.0"
              :disabled="disabled"
              :style="{ width: '100%' }"
            />
          </NFormItem>

          <NFormItem label="插值方式 (--interpolationType)">
            <NSelect
              v-model:value="advInterpolationType"
              :options="interpolationOptions"
              placeholder="默认 bilinear"
              :disabled="disabled"
              clearable
            />
          </NFormItem>

          <NFormItem label="天体 (--body)">
            <NSelect
              v-model:value="advBody"
              :options="bodyOptions"
              placeholder="默认 earth"
              :disabled="disabled"
              clearable
            />
          </NFormItem>

          <NFormItem label="瓦片缓冲区大小 (--mosaicSize)">
            <NInputNumber
              v-model:value="advMosaicSize"
              :min="0"
              placeholder="默认 16"
              :disabled="disabled"
              :style="{ width: '100%' }"
            />
          </NFormItem>

          <NFormItem label="最大栅格尺寸 (--rasterMaxSize)">
            <NInputNumber
              v-model:value="advRasterMaxSize"
              :min="256"
              placeholder="默认 8192"
              :disabled="disabled"
              :style="{ width: '100%' }"
            />
          </NFormItem>

          <div class="checkbox-group">
            <NCheckbox v-model:checked="advCalculateNormals" :disabled="disabled">
              计算法线 (--calculateNormals)
            </NCheckbox>
            <NCheckbox v-model:checked="advDebug" :disabled="disabled">
              调试日志 (--debug)
            </NCheckbox>
            <NCheckbox v-model:checked="advLeaveTemp" :disabled="disabled">
              保留临时文件 (--leaveTemp)
            </NCheckbox>
            <NCheckbox v-model:checked="advContinue" :disabled="disabled">
              断点续传 (--continue)
            </NCheckbox>
            <NCheckbox v-model:checked="advSkipStandardizationResize" :disabled="disabled">
              跳过标准化缩放 (--skipStandardizationResize)
            </NCheckbox>
          </div>

          <NFormItem label="自定义额外参数">
            <NInput
              v-model:value="advExtraArgs"
              placeholder="例如: --waterMask --metadata"
              :disabled="disabled"
            />
          </NFormItem>
        </template>
      </NForm>
    </div>

    <div class="form-actions">
      <NButton
        type="primary"
        :disabled="!canStart"
        :loading="running"
        @click="startGen"
        block
        size="large"
      >
        <template #icon>
          <NIcon size="18"><PlayOutline /></NIcon>
        </template>
        开始生成
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.gen-form {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.form-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-gutter: stable;
  padding-right: 8px;
}

.zoom-row {
  display: flex;
  gap: 16px;
}

.zoom-row > * {
  flex: 1;
}

.advanced-toggle {
  margin-top: 4px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-actions {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.form-scroll::-webkit-scrollbar {
  width: 6px;
}

.form-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.form-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 3px;
}

.form-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

.form-scroll::-webkit-scrollbar-button {
  display: none;
}
</style>
