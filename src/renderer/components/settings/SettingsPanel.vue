<script setup lang="ts">
import { onMounted } from 'vue'
import {
  NButton,
  NCard,
  NH2,
  NIcon,
  NInput,
  NRadio,
  NRadioGroup,
  NScrollbar,
  NSelect,
  NSpace,
  NText,
  NTooltip,
} from 'naive-ui'
import { RefreshOutline, SaveOutline } from '@vicons/ionicons5'
import EnvVarForm from '../form/EnvVarForm.vue'
import { useSettingsStore } from '../../stores/settings'

const logLevelOptions = [
  { label: 'Debug', value: 'debug' },
  { label: 'Info', value: 'info' },
  { label: 'Warn', value: 'warn' },
  { label: 'Error', value: 'error' },
]

const store = useSettingsStore()

onMounted(() => {
  store.loadConfig()
})
</script>

<template>
  <div class="settings-panel">
    <div class="panel-header">
      <NH2>设置</NH2>
      <div class="header-actions">
        <NTooltip trigger="hover" placement="bottom">
          <template #trigger>
            <NButton
              size="small"
              quaternary
              @click="store.loadConfig()"
              :disabled="store.saving"
            >
              <template #icon>
                <NIcon size="16"><RefreshOutline /></NIcon>
              </template>
            </NButton>
          </template>
          重新加载配置
        </NTooltip>
        <NTooltip trigger="hover" placement="bottom">
          <template #trigger>
            <NButton
              size="small"
              quaternary
              type="primary"
              @click="store.doSave()"
              :loading="store.saving"
            >
              <template #icon>
                <NIcon size="16"><SaveOutline /></NIcon>
              </template>
            </NButton>
          </template>
          保存配置
        </NTooltip>
      </div>
    </div>

    <NScrollbar class="panel-body">
      <div class="panel-content">
        <NCard title="配置文件" size="small" class="section">
          <div class="config-path">{{ store.configPath }}</div>
          <div class="config-status">
            <span class="status-dot" /> 已加载
          </div>
        </NCard>

        <NCard title="日志配置" size="small" class="section">
          <NSpace vertical size="medium">
            <div class="form-field">
              <NText depth="3" class="field-label">日志级别</NText>
              <NSelect
                v-model:value="store.form.logging.level"
                :options="logLevelOptions"
              />
            </div>
            <div class="form-field">
              <NText depth="3" class="field-label">文件输出路径</NText>
              <NInput
                v-model:value="store.form.logging.filePath"
                placeholder="留空则使用默认策略"
              />
            </div>
            <NText depth="3" style="font-size: 11px">
              开发模式下未设置时不输出日志文件，仅输出到控制台；打包模式下未设置时默认使用 exe 同目录的 logs 文件夹。
            </NText>
          </NSpace>
        </NCard>

        <NCard title="关闭行为" size="small" class="section">
          <NRadioGroup v-model:value="store.form.closeBehavior" name="close-behavior">
            <NSpace vertical size="small">
              <NRadio value="ask">每次都提示</NRadio>
              <NRadio value="exit">直接退出</NRadio>
              <NRadio value="hide">隐藏到任务栏</NRadio>
            </NSpace>
          </NRadioGroup>
          <NText depth="3" style="font-size: 11px; margin-top: 8px; display: block">
            点击窗口关闭按钮时的默认行为。
          </NText>
        </NCard>

        <NCard title="环境变量" size="small" class="section">
          <EnvVarForm v-model="store.form.env" />
        </NCard>

        <NCard title="版本信息" size="small" class="section">
          <div class="version-list">
            <div class="version-item">
              <span class="version-key">应用版本</span>
              <span class="version-val">{{ store.versions?.app ?? '—' }}</span>
            </div>
            <div class="version-item">
              <span class="version-key">Electron</span>
              <span class="version-val">{{ store.versions?.electron ?? '—' }}</span>
            </div>
            <div class="version-item">
              <span class="version-key">Node.js</span>
              <span class="version-val">{{ store.versions?.node ?? '—' }}</span>
            </div>
            <div class="version-item">
              <span class="version-key">Chromium</span>
              <span class="version-val">{{ store.versions?.chrome ?? '—' }}</span>
            </div>
            <div class="version-item">
              <span class="version-key">V8</span>
              <span class="version-val">{{ store.versions?.v8 ?? '—' }}</span>
            </div>
          </div>
        </NCard>
      </div>
    </NScrollbar>
  </div>
</template>

<style scoped>
.settings-panel {
  position: absolute;
  inset: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
  z-index: 20;
}

.panel-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.panel-body {
  flex: 1;
}

.panel-content {
  padding: 16px 20px;
}

.section {
  margin-bottom: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.config-path {
  font-size: 12px;
  font-family: 'Maple Mono', monospace;
  color: #555;
  background: #f8f8f8;
  padding: 8px 10px;
  border-radius: 4px;
  word-break: break-all;
  line-height: 1.6;
  margin-bottom: 8px;
}

.config-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #18a058;
  display: inline-block;
}

.version-list {
  font-size: 13px;
  line-height: 2;
}

.version-item {
  display: flex;
  gap: 12px;
}

.version-key {
  color: #bbb;
  flex-shrink: 0;
  width: 72px;
}

.version-val {
  color: #888;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
}
</style>
