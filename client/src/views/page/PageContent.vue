<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import { usePageStore } from '@/stores/page'
import { useLibraryStore } from '@/stores/library'
import { useSystemStore } from '@/stores/system'
import { tagApi } from '@/api/tag'
import { pageApi } from '@/api/page'
import { templateApi } from '@/api/template'
import type { Tag } from '@/types'
import { tiptapToMarkdown } from '@/utils/tiptap-to-markdown'
import { copyToClipboard } from '@/utils/clipboard'
import { formatDateByOffset, formatDateTimeByOffset } from '@/utils/datetime'
import {
  NBreadcrumb, NBreadcrumbItem,
  NInput, NTag, NButton, NIcon, NSpin, NDrawer, NDrawerContent,
  NInputNumber, useMessage, NDropdown, NModal, NCard, NForm, NFormItem
} from 'naive-ui'
import {
  InformationCircleOutline, TimeOutline, ListOutline, GlobeOutline,
  AddOutline, EllipsisHorizontalOutline, CopyOutline, BookmarkOutline
} from '@vicons/ionicons5'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import TiptapEditor from '@/components/editor/TiptapEditor.vue'
import IconPicker from '@/components/common/IconPicker.vue'
import PublicAccessDrawer from '@/components/common/PublicAccessDrawer.vue'
import VersionHistoryDrawer from '@/components/common/VersionHistoryDrawer.vue'

const route = useRoute()
const pageStore = usePageStore()
const libraryStore = useLibraryStore()
const systemStore = useSystemStore()
const message = useMessage()
const { t, locale } = useI18n()

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')

const pageId = computed(() => route.params.id as string)
const loading = ref(false)
const pageTags = ref<Tag[]>([])
const allTags = ref<Tag[]>([])
const showTagInput = ref(false)
const newTagValue = ref('')

// Drawer states
const showInfo = ref(false)
const showHistory = ref(false)
const showTasks = ref(false)
const showPublic = ref(false)
const showVersionHistory = ref(false)
const showSaveTemplateModal = ref(false)
const saveTemplateLoading = ref(false)
const saveTemplateModel = ref({
  title: '',
  description: '',
  category: '',
})
const isGroupPage = computed(() => pageStore.currentPage?.type === 'group')

// Load page data
const loadPage = async () => {
  if (!pageId.value || pageId.value === 'undefined') return

  loading.value = true
  try {
    await pageStore.fetchPage(pageId.value)
    if (pageStore.currentPage) {
      console.debug('Page content type:', typeof pageStore.currentPage.content)
      console.debug('Page content:', pageStore.currentPage.content)

      // Load tags
      const tagsRes = await tagApi.getTagsForPage(pageId.value)
      if (tagsRes.code === 0) {
        pageTags.value = tagsRes.data
      }

      // Load all tags for autocomplete
      const allTagsRes = await tagApi.getTags()
      if (allTagsRes.code === 0) {
        allTags.value = allTagsRes.data
      }
    }
  } catch (e) {
    console.error(e)
    message.error(t('pageContent.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)

watch(() => pageId.value, loadPage)

const getParentTitle = (parentId?: string) => {
  if (!parentId) return ''

  const parentInStore = pageStore.pages.find(page => page.id === parentId)
  if (parentInStore?.title) {
    return parentInStore.title
  }

  const currentParent = (pageStore.currentPage as any)?.parent
  if (currentParent?.id === parentId && currentParent?.title) {
    return currentParent.title
  }

  return t('pageContent.breadcrumb.parentFallback')
}

// Breadcrumbs
const breadcrumbs = computed(() => {
  const crumbs = []

  // Home
  crumbs.push({
    label: t('pageContent.breadcrumb.home'),
    to: { name: 'Home' }
  })

  if (!pageStore.currentPage) return crumbs

  // If this is a library (root), just show its title
  if (pageStore.currentPage.type === 'library') {
    crumbs.push({
      label: pageStore.currentPage.title,
      to: undefined // Current page
    })
    return crumbs
  }

  // Library
  if (pageStore.currentPage?.libraryId) {
    const lib = libraryStore.libraries.find(l => l.id === pageStore.currentPage?.libraryId)
    crumbs.push({
      label: lib?.title || t('pageContent.breadcrumb.libraryFallback'),
      to: { name: 'Library', params: { id: pageStore.currentPage?.libraryId } }
    })
  }

  // Parent
  if (pageStore.currentPage?.parentId) {
     crumbs.push({
       label: getParentTitle(pageStore.currentPage.parentId),
       to: { name: 'Page', params: { id: pageStore.currentPage.parentId } }
     })
  }

  // Current Page
  if (pageStore.currentPage) {
    crumbs.push({
      label: pageStore.currentPage.title,
      to: { name: 'Page', params: { id: pageStore.currentPage.id } }
    })
  }

  return crumbs
})

// Title and Description editing
const title = ref('')
const description = ref('')
const versionRetentionLimit = ref(99)

watch(() => pageStore.currentPage, (newPage) => {
  if (newPage) {
    title.value = newPage.title
    description.value = newPage.description || ''
    // Load version retention limit from metadata
    if (newPage.metadata && newPage.metadata.versionRetentionLimit !== undefined) {
      versionRetentionLimit.value = newPage.metadata.versionRetentionLimit
    } else {
      versionRetentionLimit.value = 99
    }
  }
})

const handleTitleSave = async () => {
  if (!pageStore.currentPage || title.value === pageStore.currentPage.title) return

  try {
    await pageStore.updatePage(pageStore.currentPage.id, { title: title.value })
    message.success(t('pageContent.messages.titleUpdated'))
  } catch (e) {
    message.error(t('pageContent.messages.updateTitleFailed'))
  }
}

const handleDescriptionSave = async () => {
  if (!pageStore.currentPage || description.value === (pageStore.currentPage.description || '')) return

  try {
    await pageStore.updatePage(pageStore.currentPage.id, { description: description.value })
    message.success(t('pageContent.messages.descriptionUpdated'))
  } catch (e) {
    message.error(t('pageContent.messages.updateDescriptionFailed'))
  }
}

const handleIconUpdate = async (icon: string | undefined | null) => {
  if (!pageStore.currentPage) return

  try {
    // If it's a library page, we might need to update library store too if it's loaded there
    // But pageStore.updatePage should handle the API call
    await pageStore.updatePage(pageStore.currentPage.id, { icon: icon ?? null })

    // Check if this page corresponds to a library and update it
    const lib = libraryStore.libraries.find(l => l.id === pageStore.currentPage?.id)
    if (lib) {
      // Update the library in the list
      lib.icon = icon

      // If it's the currently selected library, update that too to trigger reactivity in Sidebar
      if (libraryStore.currentLibrary?.id === lib.id) {
        libraryStore.setCurrentLibrary({ ...lib, icon })
      }
    }

    message.success(t('pageContent.messages.iconUpdated'))
  } catch (e) {
    message.error(t('pageContent.messages.updateIconFailed'))
  }
}

// Tag management
const handleAddTag = async (value: string) => {
  if (!pageStore.currentPage || !value.trim()) return

  // Check if tag exists, if not create it
  let tag = allTags.value.find(t => t.name === value)

  try {
    if (!tag) {
      const res = await tagApi.createTag(value)
      if (res.code === 0) {
        tag = res.data
        allTags.value.push(tag)
      } else {
        throw new Error(res.message)
      }
    }

    if (tag) {
      // Attach to page
      await tagApi.attachTagToPage(pageStore.currentPage.id, tag.id)
      // Check if already in pageTags
      if (!pageTags.value.some(t => t.id === tag!.id)) {
        pageTags.value.push(tag)
      }
      message.success(t('pageContent.messages.tagAdded'))
    }
  } catch (e) {
    message.error(t('pageContent.messages.addTagFailed'))
  }

  showTagInput.value = false
  newTagValue.value = ''
}

const handleRemoveTag = async (tagId: string) => {
  if (!pageStore.currentPage) return

  try {
    await tagApi.detachTagFromPage(pageStore.currentPage.id, tagId)
    pageTags.value = pageTags.value.filter(t => t.id !== tagId)
    message.success(t('pageContent.messages.tagRemoved'))
  } catch (e) {
    message.error(t('pageContent.messages.removeTagFailed'))
  }
}

// Content update
const handleContentUpdate = useDebounceFn(async (content: any) => {
  if (!pageStore.currentPage) return
  if (pageStore.currentPage.type === 'group') return

  try {
    // In a real app, we might want to check if content actually changed significantly
    await pageStore.updatePage(pageStore.currentPage.id, { content })
    // Optional: show saving indicator
  } catch (e) {
    console.error('Failed to save content', e)
    message.error(t('pageContent.messages.saveContentFailed'))
  }
}, 1000)

const handlePageUpdate = (updatedData: any) => {
  if (pageStore.currentPage) {
    // Update local state
    pageStore.currentPage = { ...pageStore.currentPage, ...updatedData }

    // If it's a library, update library store too
    if (pageStore.currentPage && pageStore.currentPage.type === 'library') {
      const lib = libraryStore.libraries.find(l => l.id === pageStore.currentPage?.id)
      if (lib) {
        Object.assign(lib, updatedData)
      }
    }
  }
}

const handleUpdateSettings = async () => {
  if (!pageStore.currentPage) return

  try {
    const res = await pageApi.updatePageSettings(pageStore.currentPage.id, {
      versionRetentionLimit: versionRetentionLimit.value
    })
    if (res.code === 0) {
      message.success(t('pageContent.messages.settingsUpdated'))
      // Update local metadata
      if (pageStore.currentPage) {
        const metadata = pageStore.currentPage.metadata || {}
        metadata.versionRetentionLimit = versionRetentionLimit.value
        pageStore.currentPage.metadata = metadata
      }
    } else {
      message.error(res.message || t('pageContent.messages.updateSettingsFailed'))
    }
  } catch (e) {
    console.error('Failed to update settings', e)
    message.error(t('pageContent.messages.updateSettingsFailed'))
  }
}

// Copy as Markdown
const handleCopyMarkdown = async () => {
  if (!pageStore.currentPage?.content) {
    message.warning(t('pageContent.messages.noContentToCopy'))
    return
  }
  try {
    const md = tiptapToMarkdown(pageStore.currentPage.content, {
      title: pageStore.currentPage.title,
      description: pageStore.currentPage.description || undefined,
    })
    const success = await copyToClipboard(md)
    if (success) {
      message.success(t('pageContent.messages.copiedAsMarkdown'))
    } else {
      message.error(t('pageContent.messages.copyFailed'))
    }
  } catch {
    message.error(t('pageContent.messages.copyFailed'))
  }
}

const openSaveTemplateModal = () => {
  if (!pageStore.currentPage) return

  const baseTitle = pageStore.currentPage.title?.trim() || t('pageContent.templateModal.defaultTitle')
  saveTemplateModel.value = {
    title: `${baseTitle} ${t('pageContent.templateModal.defaultTitleSuffix')}`.trim(),
    description: pageStore.currentPage.description || '',
    category: '',
  }
  showSaveTemplateModal.value = true
}

const clonePageContentForTemplate = () => {
  const source = pageStore.currentPage?.content
  if (!source || typeof source !== 'object') {
    return { type: 'doc', content: [] }
  }

  try {
    return JSON.parse(JSON.stringify(source))
  } catch {
    return { type: 'doc', content: [] }
  }
}

const handleSaveAsTemplate = async () => {
  if (!saveTemplateModel.value.title.trim()) {
    message.warning(t('pageContent.messages.templateNameRequired'))
    return
  }

  saveTemplateLoading.value = true
  try {
    const response = await templateApi.createTemplate({
      title: saveTemplateModel.value.title.trim(),
      description: saveTemplateModel.value.description.trim() || undefined,
      category: saveTemplateModel.value.category.trim() || undefined,
      content: clonePageContentForTemplate(),
    })

    if (response.code === 0) {
      message.success(t('pageContent.messages.templateSaved'))
      showSaveTemplateModal.value = false
    } else {
      message.error(t('pageContent.messages.saveTemplateFailed'))
    }
  } catch {
    message.error(t('pageContent.messages.saveTemplateFailed'))
  } finally {
    saveTemplateLoading.value = false
  }
}

// Mobile Actions Menu
const mobileActionOptions = computed(() => [
  { label: t('pageContent.mobileAction.info'), key: 'info', icon: () => h(NIcon, null, { default: () => h(InformationCircleOutline) }) },
  { label: t('pageContent.mobileAction.history'), key: 'history', icon: () => h(NIcon, null, { default: () => h(TimeOutline) }) },
  { label: t('pageContent.mobileAction.tasks'), key: 'tasks', icon: () => h(NIcon, null, { default: () => h(ListOutline) }) },
  { label: t('pageContent.mobileAction.publicAccess'), key: 'public', icon: () => h(NIcon, null, { default: () => h(GlobeOutline) }) },
])

const handleMobileActionSelect = (key: string) => {
  if (key === 'info') showInfo.value = true
  if (key === 'history') showVersionHistory.value = true
  if (key === 'tasks') showTasks.value = true
  if (key === 'public') showPublic.value = true
}

</script>

<template>
  <div class="page-content" v-if="pageStore.currentPage">
    <!-- Header -->
    <div class="page-header">
      <n-breadcrumb>
        <n-breadcrumb-item v-for="(crumb, index) in breadcrumbs" :key="index" :to="crumb.to">
          {{ crumb.label }}
        </n-breadcrumb-item>
      </n-breadcrumb>

      <div class="header-main" :class="{ 'mobile-header': isMobile }">
        <div class="title-section">
          <IconPicker
            :value="pageStore.currentPage.icon ?? undefined"
            @update:value="handleIconUpdate"
          />
          <div class="title-wrapper">
            <n-input
              v-model:value="title"
              type="text"
              :placeholder="t('pageContent.input.pageTitle')"
              class="title-input"
              @blur="handleTitleSave"
              @keyup.enter="handleTitleSave"
            />
            <n-input
              v-model:value="description"
              type="text"
              :placeholder="t('pageContent.input.addDescription')"
              class="description-input"
              :maxlength="100"
              @blur="handleDescriptionSave"
              @keyup.enter="handleDescriptionSave"
            />
          </div>
        </div>

        <div class="actions" v-if="!isMobile">
          <n-button quaternary circle @click="showInfo = true">
            <template #icon><n-icon><InformationCircleOutline /></n-icon></template>
          </n-button>
          <n-button quaternary circle @click="showVersionHistory = true">
            <template #icon><n-icon><TimeOutline /></n-icon></template>
          </n-button>
          <n-button quaternary circle @click="showTasks = true">
            <template #icon><n-icon><ListOutline /></n-icon></template>
          </n-button>
          <n-button quaternary circle @click="showPublic = true">
            <template #icon><n-icon><GlobeOutline /></n-icon></template>
          </n-button>
        </div>
        <div class="actions-mobile" v-else>
           <n-dropdown :options="mobileActionOptions" @select="handleMobileActionSelect">
             <n-button quaternary circle>
                <template #icon><n-icon><EllipsisHorizontalOutline /></n-icon></template>
             </n-button>
           </n-dropdown>
        </div>
      </div>

      <div class="meta-section">
        <div class="tags">
          <n-tag
            v-for="tag in pageTags"
            :key="tag.id"
            closable
            @close="handleRemoveTag(tag.id)"
            size="small"
          >
            {{ tag.name }}
          </n-tag>

          <n-input
            v-if="showTagInput"
            v-model:value="newTagValue"
            :placeholder="t('pageContent.input.newTag')"
            size="small"
            autosize
            style="width: 100px"
            @blur="showTagInput = false"
            @keyup.enter="handleAddTag(newTagValue)"
          />
          <n-button v-else size="tiny" dashed @click="showTagInput = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            {{ t('pageContent.actions.addTag') }}
          </n-button>
        </div>

        <div class="timestamps">
          <span>{{ t('pageContent.timestamps.created', { date: formatDateByOffset(pageStore.currentPage.createdAt, systemStore.siteTimezone, locale) }) }}</span>
          <span>{{ t('pageContent.timestamps.updated', { date: formatDateByOffset(pageStore.currentPage.updatedAt, systemStore.siteTimezone, locale) }) }}</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="content-area">
      <TiptapEditor
        :key="pageStore.currentPage.id"
        :content="pageStore.currentPage.content"
        :page-id="pageStore.currentPage.id"
        :library-id="pageStore.currentPage.libraryId"
        :editable="!isGroupPage"
        @update="handleContentUpdate"
      />
    </div>

    <!-- Drawers/Modals -->
    <n-drawer v-model:show="showInfo" width="350">
      <n-drawer-content :title="t('pageContent.infoDrawer.title')">
        <div class="page-info-content">
          <div class="info-section">
            <h4>{{ t('pageContent.infoDrawer.basicInfo') }}</h4>
            <p><strong>{{ t('pageContent.infoDrawer.pageId') }}:</strong> {{ pageStore.currentPage.id }}</p>
            <p><strong>{{ t('pageContent.infoDrawer.libraryId') }}:</strong> {{ pageStore.currentPage.libraryId || t('pageContent.infoDrawer.notAvailable') }}</p>
            <p><strong>{{ t('pageContent.infoDrawer.type') }}:</strong> {{ pageStore.currentPage.type }}</p>
          </div>

          <div class="info-section">
            <h4>{{ t('pageContent.infoDrawer.versionSettings') }}</h4>
            <p style="font-size: 12px; color: var(--color-toc-text); margin-bottom: 8px;">
              {{ t('pageContent.infoDrawer.versionHint') }}
            </p>
            <n-input-number
              v-model:value="versionRetentionLimit"
              :min="0"
              :max="999"
              :placeholder="t('pageContent.infoDrawer.versionLimitPlaceholder')"
              size="small"
              style="width: 100%; margin-bottom: 8px;"
            >
              <template #suffix>{{ t('pageContent.infoDrawer.versionsSuffix') }}</template>
            </n-input-number>
            <n-button
              size="small"
              type="primary"
              :disabled="!pageStore.currentPage?.id"
              @click="handleUpdateSettings"
            >
              {{ t('pageContent.actions.saveSettings') }}
            </n-button>
          </div>

          <div class="info-section">
            <h4>{{ t('pageContent.infoDrawer.export') }}</h4>
            <n-button
              size="small"
              @click="handleCopyMarkdown"
              style="width: 100%;"
            >
              <template #icon><n-icon><CopyOutline /></n-icon></template>
              {{ t('pageContent.actions.copyAsMarkdown') }}
            </n-button>
            <n-button
              size="small"
              type="primary"
              secondary
              @click="openSaveTemplateModal"
              style="width: 100%; margin-top: 8px;"
            >
              <template #icon><n-icon><BookmarkOutline /></n-icon></template>
              {{ t('pageContent.actions.saveAsTemplate') }}
            </n-button>
          </div>

          <div class="info-section">
            <h4>{{ t('pageContent.infoDrawer.timestamps') }}</h4>
            <p><strong>{{ t('pageContent.infoDrawer.created') }}:</strong> {{ formatDateTimeByOffset(pageStore.currentPage.createdAt, systemStore.siteTimezone, locale) }}</p>
            <p><strong>{{ t('pageContent.infoDrawer.updated') }}:</strong> {{ formatDateTimeByOffset(pageStore.currentPage.updatedAt, systemStore.siteTimezone, locale) }}</p>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showHistory" width="300">
      <n-drawer-content :title="t('pageContent.historyDrawer.title')">
        <p>{{ t('pageContent.historyDrawer.placeholder') }}</p>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showTasks" width="300">
      <n-drawer-content :title="t('pageContent.tasksDrawer.title')">
        <p>{{ t('pageContent.tasksDrawer.placeholder') }}</p>
      </n-drawer-content>
    </n-drawer>

    <PublicAccessDrawer
      v-model:show="showPublic"
      :type="pageStore.currentPage?.type === 'library' ? 'library' : 'page'"
      :data="pageStore.currentPage"
      @update="handlePageUpdate"
    />

    <VersionHistoryDrawer
      v-model:show="showVersionHistory"
      :page-id="pageStore.currentPage?.id"
      @restore="loadPage"
    />

    <NModal v-model:show="showSaveTemplateModal">
      <NCard
        style="width: 600px"
        :title="t('pageContent.templateModal.title')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <NForm>
          <NFormItem :label="t('pageContent.templateModal.form.name')">
            <NInput
              v-model:value="saveTemplateModel.title"
              :placeholder="t('pageContent.templateModal.placeholders.name')"
            />
          </NFormItem>
          <NFormItem :label="t('pageContent.templateModal.form.description')">
            <NInput
              v-model:value="saveTemplateModel.description"
              type="textarea"
              :placeholder="t('pageContent.templateModal.placeholders.description')"
              :autosize="{ minRows: 2, maxRows: 4 }"
            />
          </NFormItem>
          <NFormItem :label="t('pageContent.templateModal.form.category')">
            <NInput
              v-model:value="saveTemplateModel.category"
              :placeholder="t('pageContent.templateModal.placeholders.category')"
            />
          </NFormItem>
        </NForm>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <NButton @click="showSaveTemplateModal = false">{{ t('common.actions.cancel') }}</NButton>
            <NButton type="primary" :loading="saveTemplateLoading" @click="handleSaveAsTemplate">
              {{ t('common.actions.create') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>
  </div>
  <div v-else-if="loading" class="loading-state">
    <n-spin size="large" />
  </div>
  <div v-else class="empty-state">
    {{ t('pageContent.emptyState.selectPage') }}
  </div>
</template>

<style scoped lang="scss">
.page-content {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;

  @media (max-width: 1024px) {
    padding: 16px;
  }
}

.page-header {
  margin-bottom: 32px;

  .header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    margin-bottom: 16px;

    &.mobile-header {
       align-items: flex-start;

       .title-section {
          max-width: calc(100% - 40px);
       }
    }

    .title-section {
      flex: 1;
      margin-right: 16px;
      display: flex;
      align-items: flex-start;

      .title-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .title-input {
        font-size: 24px;
        font-weight: bold;
        border: none;
        background: transparent;
        padding: 0;

        :deep(.n-input__input-el) {
          height: auto;
        }

        :deep(.n-input__border), :deep(.n-input__state-border) {
          display: none;
        }

        &:hover {
          background: var(--color-bg-hover);
        }
      }

      .description-input {
        font-size: 14px;
        color: var(--color-text-muted);
        border: none;
        background: transparent;
        padding: 0;

        :deep(.n-input__input-el) {
          height: auto;
          padding: 0;
        }

        :deep(.n-input__border), :deep(.n-input__state-border) {
          display: none;
        }

        &:hover, &:focus-within {
          background: var(--color-bg-hover);
        }
      }
    }
  }

  .meta-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--n-text-color-3);

    .tags {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .timestamps {
      display: flex;
      gap: 16px;
    }
  }
}

.content-area {
  min-height: 400px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  $content-padding: 24px;
  padding: $content-padding;
  padding-left: calc(#{$content-padding} * 2.5);
  padding-right: calc(#{$content-padding} * 2.5);
  box-shadow: var(--shadow-card);

  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: monospace;
    font-size: 12px;
    color: var(--color-toc-text);
  }
}

.loading-state, .empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--color-toc-empty);
}

.page-info-content {
  padding: 8px 0;

  .info-section {
    margin-bottom: 24px;
    padding: 12px;
    background: var(--color-bg-info-section);
    border-radius: 8px;
    border: 1px solid var(--color-border-info);

    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-toc-heading);
    }

    p {
      margin: 4px 0;
      font-size: 13px;
      color: var(--color-text-muted);

      strong {
        color: var(--color-toc-heading);
        margin-right: 4px;
      }
    }
  }
}
</style>
