<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { pageApi } from '@/api/page'
import type { PageVersion } from '@/types'
import { useSystemStore } from '@/stores/system'
import { formatDateTimeByOffset } from '@/utils/datetime'
import {
  NDrawer, NDrawerContent, NButton, NIcon, NSpin,
  NTime, NPopconfirm, NSelect, NInput, NAlert, useMessage, NInputGroup, NEmpty,
  NText
} from 'naive-ui'
import {
  TrashOutline, SaveOutline,
  InformationCircleOutline,
  TrashBinOutline
} from '@vicons/ionicons5'

const props = defineProps<{
  show: boolean
  pageId: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'restore'): void
}>()

const message = useMessage()
const systemStore = useSystemStore()
const { t, locale } = useI18n()

const loading = ref(false)
const versions = ref<PageVersion[]>([])
const showCleanupConfirm = ref(false)
const cleanupPeriod = ref<'day' | 'week' | 'month'>('week')
const newVersionMessage = ref('')

// Computed properties
const sortedVersions = computed(() => {
  return [...versions.value].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

const hasVersions = computed(() => versions.value.length > 0)

// Load versions
const loadVersions = async () => {
  if (!props.pageId) return

  loading.value = true
  try {
    const res = await pageApi.getVersions(props.pageId)
    if (res.code === 0) {
      versions.value = res.data
    }
  } catch (e) {
    console.error('Failed to load versions', e)
    message.error(t('versionHistory.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

// Create new version
const handleCreateVersion = async () => {
  if (!props.pageId) return

  try {
    const res = await pageApi.createVersion(props.pageId, { message: newVersionMessage.value })
    if (res.code === 0) {
      message.success(t('versionHistory.messages.createSuccess'))
      versions.value.unshift(res.data)
      newVersionMessage.value = ''
    } else {
      message.error(res.message || t('versionHistory.messages.createFailed'))
    }
  } catch (e) {
    console.error('Failed to create version', e)
    message.error(t('versionHistory.messages.createFailed'))
  }
}

// Restore version
const handleRestoreVersion = async (versionId: string) => {
  if (!props.pageId) return

  try {
    const res = await pageApi.restoreVersion(props.pageId, versionId)
    if (res.code === 0) {
      message.success(t('versionHistory.messages.restoreSuccess'))
      emit('restore')
      emit('update:show', false)
    } else {
      message.error(res.message || t('versionHistory.messages.restoreFailed'))
    }
  } catch (e) {
    console.error('Failed to restore version', e)
    message.error(t('versionHistory.messages.restoreFailed'))
  }
}

// Clean up old versions
const handleCleanupVersions = async () => {
  if (!props.pageId) return

  try {
    const res = await pageApi.cleanupVersions(props.pageId, { period: cleanupPeriod.value })
    if (res.code === 0) {
      message.success(res.data.message)
      showCleanupConfirm.value = false
      await loadVersions()
    } else {
      message.error(res.message || t('versionHistory.messages.cleanupFailed'))
    }
  } catch (e) {
    console.error('Failed to clean up versions', e)
    message.error(t('versionHistory.messages.cleanupFailed'))
  }
}

// Delete a specific version
const handleDeleteVersion = async (versionId: string) => {
  if (!props.pageId) return

  try {
    const res = await pageApi.deleteVersion(props.pageId, versionId)
    if (res.code === 0) {
      message.success(t('versionHistory.messages.deleteSuccess'))
      await loadVersions()
    } else {
      message.error(res.message || t('versionHistory.messages.deleteFailed'))
    }
  } catch (e) {
    console.error('Failed to delete version', e)
    message.error(t('versionHistory.messages.deleteFailed'))
  }
}

// Get version preview (first few characters of content)
const getVersionPreview = (version: PageVersion) => {
  if (!version.content || !version.content.content) return t('versionHistory.preview.noContent')

  try {
    const text = version.content.content
      .map((block: any) => {
        if (block.content) {
          return block.content.map((inline: any) => inline.text || '').join('')
        }
        return ''
      })
      .join(' ')
      .trim()

    return text.substring(0, 80) + (text.length > 80 ? '...' : '') || t('versionHistory.preview.emptyContent')
  } catch (e) {
    return t('versionHistory.preview.unavailable')
  }
}

// Watch for show prop changes
const handleShowChange = (show: boolean) => {
  if (show && props.pageId) {
    loadVersions()
  }
}

// Watch props
watch(() => props.show, handleShowChange)
watch(() => props.pageId, () => {
  if (props.show) {
    loadVersions()
  }
})

// Initialize on mount
onMounted(() => {
  if (props.show && props.pageId) {
    loadVersions()
  }
})
</script>

<template>
  <n-drawer
    :show="show"
    width="400"
    placement="right"
    @update:show="$emit('update:show', $event)"
  >
    <n-drawer-content
      :title="t('versionHistory.title')"
      :closable="true"
      :body-content-style="{ padding: 0 }"
      class="version-drawer"
    >
      <div v-if="loading" class="loading-state">
        <n-spin size="large" />
      </div>

      <div v-else class="drawer-layout">
        <!-- Top Controls: Only Create & Info -->
        <div class="controls-area">
          <n-alert type="info" :show-icon="false" class="info-alert" :bordered="false">
            <template #header>
              <div class="info-header">
                <n-icon><InformationCircleOutline /></n-icon>
                <span>{{ t('versionHistory.autoSaveHint') }}</span>
              </div>
            </template>
          </n-alert>

          <div class="create-version-row">
            <n-input-group>
              <n-input
                v-model:value="newVersionMessage"
                :placeholder="t('versionHistory.newVersionPlaceholder')"
                size="small"
                :maxlength="50"
                show-count
                @keydown.enter="handleCreateVersion"
              />
              <n-button type="primary" size="small" :disabled="!props.pageId" @click="handleCreateVersion">
                <template #icon><n-icon><SaveOutline /></n-icon></template>
                {{ t('versionHistory.save') }}
              </n-button>
            </n-input-group>
          </div>
        </div>

        <!-- History List -->
        <div class="list-container">
          <div v-if="hasVersions" class="versions-list">
               <div
                 v-for="version in sortedVersions"
                 :key="version.id"
                 class="version-item"
               >
                 <div class="version-meta-row">
                    <div class="version-time-group">
                      <span class="version-time">{{ formatDateTimeByOffset(version.createdAt, systemStore.siteTimezone, locale) }}</span>
                      <n-text depth="3" class="relative-time">
                         (<n-time :time="new Date(version.createdAt)" type="relative" />)
                      </n-text>
                    </div>
                    
                    <div class="version-actions">
                       <n-popconfirm
                         @positive-click="handleRestoreVersion(version.id)"
                         :positive-text="t('versionHistory.restore')"
                         :negative-text="t('common.actions.cancel')"
                       >
                         <template #trigger>
                           <n-button size="tiny" secondary type="primary">
                             {{ t('versionHistory.restore') }}
                           </n-button>
                         </template>
                         <div class="restore-confirm-content">
                           <p>{{ t('versionHistory.restoreConfirm') }}</p>
                           <n-text depth="3" size="small">{{ t('versionHistory.restoreConfirmHint') }}</n-text>
                         </div>
                       </n-popconfirm>
                       <n-popconfirm
                         @positive-click="handleDeleteVersion(version.id)"
                         :positive-text="t('common.actions.delete')"
                         :negative-text="t('common.actions.cancel')"
                       >
                         <template #trigger>
                           <n-button size="tiny" secondary type="error">
                             <template #icon><n-icon><TrashBinOutline /></n-icon></template>
                           </n-button>
                         </template>
                         <div class="restore-confirm-content">
                           <p>{{ t('versionHistory.deleteConfirm') }}</p>
                           <n-text depth="3" size="small">{{ t('versionHistory.deleteConfirmHint') }}</n-text>
                         </div>
                       </n-popconfirm>
                    </div>
                 </div>

                 <div class="version-message-row" v-if="version.message">
                    <n-text class="message-text">{{ version.message }}</n-text>
                 </div>
                 
                 <div class="version-preview">
                    {{ getVersionPreview(version) }}
                 </div>
               </div>
          </div>
          
          <div v-else class="empty-state">
            <n-empty :description="t('versionHistory.noVersionHistory')">
               <template #extra>
                  <span class="empty-hint">{{ t('versionHistory.emptyHint') }}</span>
               </template>
            </n-empty>
          </div>
        </div>
      </div>

      <!-- Footer: Cleanup Controls -->
      <template #footer>
        <div class="cleanup-footer">
           <span class="label">{{ t('versionHistory.cleanOlderThan') }}</span>
           <n-select
            v-model:value="cleanupPeriod"
            :options="[
              { label: t('versionHistory.period.day'), value: 'day' },
              { label: t('versionHistory.period.week'), value: 'week' },
              { label: t('versionHistory.period.month'), value: 'month' }
            ]"
            size="tiny"
            class="cleanup-select"
          />
          <n-popconfirm
            v-model:show="showCleanupConfirm"
            @positive-click="handleCleanupVersions"
            :negative-text="null"
          >
            <template #trigger>
              <n-button size="tiny" secondary type="error" :disabled="!hasVersions">
                <template #icon><n-icon><TrashOutline /></n-icon></template>
                {{ t('versionHistory.cleanUp') }}
              </n-button>
            </template>
            <p>{{ t('versionHistory.cleanConfirm') }}</p>
          </n-popconfirm>
        </div>
      </template>

    </n-drawer-content>
  </n-drawer>
</template>

<style scoped lang="scss">
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.drawer-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.controls-area {
  padding: 16px;
  background-color: var(--n-color-modal);
  border-bottom: 1px solid var(--n-divider-color);
}

.info-alert {
  margin-bottom: 12px;
  background-color: rgba(var(--n-info-color-rgb), 0.05);
  
  .info-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
}

.list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 12px;
  padding-bottom: 20px;
}

.version-item {
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid var(--n-divider-color);
  border-radius: 10px;
  background-color: var(--n-color-embedded);

  &:hover {
    background-color: var(--n-color-hover);
  }
}

.version-item:last-child {
  margin-bottom: 0;
}

.version-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.version-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.version-time-group {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .version-time {
    font-weight: 500;
    font-size: 14px;
    color: var(--n-text-color-1);
  }

  .relative-time {
    font-size: 12px;
  }
}

.version-message-row {
  margin-bottom: 8px;
  
  .message-text {
    font-size: 13px;
    padding: 2px 8px;
    background-color: rgba(var(--n-info-color-rgb), 0.1);
    color: var(--n-text-color-2);
    border-radius: 4px;
    display: inline-block;
    max-width: 100%;
    word-break: break-word;
  }
}

.version-preview {
  font-size: 12px;
  color: var(--n-text-color-3);
  line-height: 1.5;
  background-color: rgba(0, 0, 0, 0.03);
  padding: 8px;
  border-radius: 4px;
  border-left: 2px solid var(--n-border-color);
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  
  .empty-hint {
    font-size: 12px;
    color: var(--n-text-color-3);
  }
}

.cleanup-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  width: 100%;
  
  .label {
    font-size: 12px;
    color: var(--n-text-color-3);
  }

  .cleanup-select {
    width: 110px;
  }
}

.restore-confirm-content {
  max-width: 200px;
  p {
    margin: 0 0 4px 0;
  }
}
</style>
