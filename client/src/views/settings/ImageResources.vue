<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NSpace,
  NCard,
  NEmpty,
  NButton,
  NImage,
  NText,
  NTag,
  NGrid,
  NGridItem,
  NSpin,
  NInput,
  NSelect,
  useMessage,
  useDialog,
  NIcon,
  NTooltip,
  NEllipsis
} from 'naive-ui'
import {
  TrashOutline,
  CopyOutline,
  ArrowForwardOutline as ArrowRightIcon,
  ImageOutline as ImageIcon,
  CloudUploadOutline as UploadIcon
} from '@vicons/ionicons5'
import { uploadApi } from '@/api/upload'
import { copyToClipboard } from '@/utils/clipboard'
import { useSystemStore } from '@/stores/system'
import { formatDateByOffset, parseDateValue } from '@/utils/datetime'

interface UploadedImage {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  pageId: string | null
  libraryId: string | null
  createdAt: string
  pageTitle?: string
  pageType?: string
  libraryTitle?: string
}

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const systemStore = useSystemStore()
const { t, locale } = useI18n()

const loading = ref(false)
const images = ref<UploadedImage[]>([])
const searchQuery = ref('')
const filterType = ref<'all' | 'page' | 'library' | 'orphan'>('all')

const filteredImages = computed(() => {
  let result = images.value

  // Filter by type
  if (filterType.value === 'page') {
    result = result.filter(img => img.pageId && !img.libraryId)
  } else if (filterType.value === 'library') {
    result = result.filter(img => img.libraryId)
  } else if (filterType.value === 'orphan') {
    result = result.filter(img => !img.pageId && !img.libraryId)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(img =>
      img.originalName.toLowerCase().includes(query) ||
      img.pageTitle?.toLowerCase().includes(query) ||
      img.libraryTitle?.toLowerCase().includes(query)
    )
  }

  return result
})

const filterOptions = computed(() => [
  { label: t('settingsPage.assets.filters.all'), value: 'all' },
  { label: t('settingsPage.assets.filters.page'), value: 'page' },
  { label: t('settingsPage.assets.filters.library'), value: 'library' },
  { label: t('settingsPage.assets.filters.orphan'), value: 'orphan' }
])

async function loadImages() {
  loading.value = true
  try {
    images.value = await uploadApi.getImages()
  } catch (error: any) {
    message.error(error.message || t('settingsPage.assets.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function handleDeleteImage(image: UploadedImage) {
  dialog.warning({
    title: t('settingsPage.assets.deleteDialog.title'),
    content: t('settingsPage.assets.deleteDialog.content', { name: image.originalName }),
    positiveText: t('common.actions.delete'),
    negativeText: t('common.actions.cancel'),
    onPositiveClick: async () => {
      try {
        loading.value = true
        await uploadApi.deleteImage(image.id)
        message.success(t('settingsPage.assets.messages.deleteSuccess'))
        await loadImages()
      } catch (error: any) {
        message.error(error.message || t('settingsPage.assets.messages.deleteFailed'))
        loading.value = false
      }
    }
  })
}

function handleNavigateToPage(image: UploadedImage) {
  if (image.pageId) {
    if (image.pageType === 'library') {
      router.push(`/library/${image.pageId}`)
    } else {
      router.push(`/page/${image.pageId}`)
    }
  } else if (image.libraryId) {
    router.push(`/library/${image.libraryId}`)
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function getImageCacheBuster(value: string): number {
  const parsed = parseDateValue(value)
  return parsed ? parsed.getTime() : Date.now()
}

function getLocationInfo(image: UploadedImage): { text: string; type: 'success' | 'info' | 'warning' } {
  if (image.pageId && image.pageTitle) {
    if (image.pageType === 'library') {
      return { text: t('settingsPage.assets.location.library', { name: image.pageTitle }), type: 'success' }
    }
    return { text: t('settingsPage.assets.location.page', { name: image.pageTitle }), type: 'info' }
  }
  if (image.libraryId && image.libraryTitle) {
    return { text: t('settingsPage.assets.location.library', { name: image.libraryTitle }), type: 'success' }
  }
  return { text: t('settingsPage.assets.location.notAssociated'), type: 'warning' }
}

async function copyImageUrl(url: string) {
  const fullUrl = window.location.origin + url
  const success = await copyToClipboard(fullUrl)
  if (success) {
    message.success(t('settingsPage.assets.messages.copySuccess'))
  } else {
    message.error(t('settingsPage.assets.messages.copyFailed'))
  }
}

function handleReplaceImage(image: UploadedImage) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    try {
      loading.value = true
      const formData = new FormData()
      formData.append('file', file)

      await uploadApi.replaceImage(image.id, formData)
      message.success(t('settingsPage.assets.messages.replaceSuccess'))

      // 重新加载图片列表
      await loadImages()

      // 强制刷新该图片的显示（破坏浏览器缓存）
      // 通过更新图片对象来触发Vue的响应式更新
      const index = images.value.findIndex(img => img.id === image.id)
      if (index !== -1) {
        images.value[index] = { ...images.value[index] }
      }
    } catch (error: any) {
      message.error(error.message || t('settingsPage.assets.messages.replaceFailed'))
    } finally {
      loading.value = false
    }
  }
  input.click()
}

onMounted(() => {
  loadImages()
})
</script>

<template>
  <div class="settings-page">
    <div class="header">
      <h2>{{ t('settingsPage.assets.title') }}</h2>
      <p class="description">{{ t('settingsPage.assets.description') }}</p>
    </div>

    <NCard class="content-card">
      <div class="toolbar">
        <NSpace justify="space-between" align="center" style="flex-wrap: wrap; gap: 12px">
          <NSpace>
            <NInput
              v-model:value="searchQuery"
              :placeholder="t('settingsPage.assets.searchPlaceholder')"
              clearable
              style="width: 260px"
            >
              <template #prefix>
                <NIcon :component="ImageIcon" />
              </template>
            </NInput>
            <NSelect
              v-model:value="filterType"
              :options="filterOptions"
              style="width: 160px"
            />
          </NSpace>
          <NButton @click="loadImages" :loading="loading" secondary>
            {{ t('common.actions.refresh') }}
          </NButton>
        </NSpace>
      </div>

      <NSpin :show="loading">
        <div v-if="filteredImages.length === 0 && !loading" class="empty-state">
          <NEmpty :description="t('settingsPage.assets.noImages')">
            <template #extra>
              <NText depth="3">
                {{ searchQuery || filterType !== 'all'
                  ? t('settingsPage.assets.emptyAdjust')
                  : t('settingsPage.assets.emptyUploadHint') }}
              </NText>
            </template>
          </NEmpty>
        </div>

        <div v-else class="image-grid-container">
          <NGrid cols="1 s:2 m:3 l:4 xl:5" responsive="screen" :x-gap="16" :y-gap="16">
            <NGridItem v-for="image in filteredImages" :key="image.id">
              <NCard class="image-item-card" size="small" hoverable>
                <template #cover>
                  <div class="image-preview-wrapper">
                    <NImage
                      :src="image.url + '?t=' + getImageCacheBuster(image.createdAt)"
                      :alt="image.originalName"
                      object-fit="cover"
                      class="grid-image"
                      lazy
                      fallback-src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100%25' height='100%25' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23ccc'%3ENo Image%3C/text%3E%3C/svg%3E"
                    />
                  </div>
                </template>

                <div class="card-content">
                  <div class="title-row">
                    <NTooltip trigger="hover">
                      <template #trigger>
                        <NText strong class="image-name">
                          <NEllipsis>{{ image.originalName }}</NEllipsis>
                        </NText>
                      </template>
                      {{ image.originalName }}
                    </NTooltip>
                  </div>

                  <div class="meta-row">
                    <NTag :type="getLocationInfo(image).type" size="tiny" :bordered="false">
                      <NEllipsis style="max-width: 120px">{{ getLocationInfo(image).text }}</NEllipsis>
                    </NTag>
                  </div>

                  <div class="info-row">
                    <NText depth="3" class="meta-text">
                      {{ formatFileSize(image.size) }} • {{ formatDateByOffset(image.createdAt, systemStore.siteTimezone, locale) }}
                    </NText>
                  </div>
                </div>

                <template #action>
                  <NSpace justify="space-between" size="small" align="center">
                    <NTooltip>
                      <template #trigger>
                        <NButton size="tiny" quaternary circle @click="copyImageUrl(image.url)">
                          <template #icon><NIcon :component="CopyOutline" /></template>
                        </NButton>
                      </template>
                      {{ t('settingsPage.assets.tooltips.copyUrl') }}
                    </NTooltip>

                    <NTooltip v-if="image.pageId || image.libraryId">
                      <template #trigger>
                        <NButton size="tiny" quaternary circle @click="handleNavigateToPage(image)">
                          <template #icon><NIcon :component="ArrowRightIcon" /></template>
                        </NButton>
                      </template>
                      {{ image.pageType === 'library' ? t('settingsPage.assets.tooltips.goToLibrary') : t('settingsPage.assets.tooltips.goToPage') }}
                    </NTooltip>

                    <NTooltip>
                      <template #trigger>
                        <NButton size="tiny" quaternary circle @click="handleReplaceImage(image)">
                          <template #icon><NIcon :component="UploadIcon" /></template>
                        </NButton>
                      </template>
                      {{ t('settingsPage.assets.tooltips.replaceImage') }}
                    </NTooltip>


                    <NButton size="tiny" quaternary circle type="error" @click="handleDeleteImage(image)">
                      <template #icon><NIcon :component="TrashOutline" /></template>
                    </NButton>
                  </NSpace>
                </template>
              </NCard>
            </NGridItem>
          </NGrid>
        </div>
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.header {
  margin-bottom: 24px;

  h2 {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: var(--n-text-color);
  }

  .description {
    margin: 0;
    color: var(--n-text-color-3);
    font-size: 14px;
  }
}

.content-card {
  min-height: 400px;
}

.toolbar {
  margin-bottom: 24px;
}

.empty-state {
  padding: 60px 20px;
  display: flex;
  justify-content: center;
}

.image-item-card {
  height: 100%;
  display: flex;
  flex-direction: column;

  :deep(.n-card-cover) {
    overflow: hidden;
    background: var(--n-color-target);
  }

  :deep(.n-card__content) {
    padding: 12px;
  }
}

.image-preview-wrapper {
  position: relative;
  width: 100%;
  padding-top: 66.67%; // 3:2 Aspect Ratio

  .grid-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-name {
  font-size: 14px;
}

.meta-row {
  min-height: 22px;
}

.meta-text {
  font-size: 12px;
}
</style>
