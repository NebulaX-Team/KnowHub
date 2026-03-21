<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NSpin, NResult, NTag, NButton, NIcon, useMessage } from 'naive-ui'
import { ShareSocialOutline } from '@vicons/ionicons5'
import { api } from '@/api/http'
import { usePublicStore } from '@/stores/public'
import TiptapEditor from '@/components/editor/TiptapEditor.vue'
import { copyToClipboard } from '@/utils/clipboard'
import type { Page } from '@/types'

interface PublicPageData extends Page {
  tags?: Array<{ id: string; name: string; color?: string }>;
  author?: { displayName: string; avatar?: string };
}

const route = useRoute()
const message = useMessage()
const publicStore = usePublicStore()
const { t, locale } = useI18n()
const page = ref<PublicPageData | null>(null)
const loading = ref(false)
const error = ref('')

async function copyLink() {
  const success = await copyToClipboard(window.location.href)
  if (success) {
    message.success(t('publicPage.copySuccess'))
  } else {
    message.error(t('publicPage.copyFailed'))
  }
}

async function fetchPage() {
  const slug = route.params.slug as string
  if (!slug) return

  loading.value = true
  error.value = ''
  try {
    const isLibrary = route.path.includes('/libraries/')
    const url = isLibrary ? `/public/libraries/${slug}` : `/public/pages/${slug}`
    const res = await api.get(url)
    page.value = res.data
    
    // Update store
    publicStore.currentPageId = page.value?.id || ''
    const libId = isLibrary ? page.value?.id : page.value?.libraryId
    if (libId) {
      publicStore.fetchTree(libId)
    }
    
    // 手动更新浏览器标题
    if (page.value) {
      document.title = `${page.value.icon ? page.value.icon + ' ' : ''}${page.value.title}`
    }
  } catch (err) {
    error.value = t('publicPage.notFound')
  } finally {
    loading.value = false
  }
}

watch(() => route.params.slug, fetchPage, { immediate: true })
</script>

<template>
  <div v-if="loading" class="loading-state">
    <NSpin size="large" />
  </div>
  <div v-else-if="error" class="error-state">
    <NResult status="404" :title="t('publicPage.errorTitle')" :description="error" />
  </div>
  <div v-else-if="page" class="page-content">
    <!-- Header -->
    <div class="page-header">
      <div class="header-main">
        <div class="title-section">
          <div v-if="page.icon" class="icon-wrapper">
            <span class="page-icon">{{ page.icon }}</span>
          </div>
          
          <div class="title-wrapper">
            <h1 class="page-title">{{ page.title }}</h1>
            <p v-if="page.description" class="page-description">{{ page.description }}</p>
          </div>
        </div>
        <NButton tertiary size="small" @click="copyLink">
          <template #icon>
            <NIcon><ShareSocialOutline /></NIcon>
          </template>
          {{ t('publicPage.share') }}
        </NButton>
      </div>
      
      <div class="meta-section">
        <div class="meta-info">
          <div class="author" v-if="page.author">
            {{ t('publicPage.publishedBy', { name: page.author.displayName }) }}
          </div>
          <div class="tags" v-if="page.tags && page.tags.length">
            <n-tag v-for="tag in page.tags" :key="tag.id" size="small" :bordered="false" class="tag-item">
              {{ tag.name }}
            </n-tag>
          </div>
        </div>
        <div class="timestamps">
          <span>
            {{ t('publicPage.updated', { date: new Date(page.updatedAt).toLocaleDateString(locale) }) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="content-area">
      <TiptapEditor 
        :content="page.content" 
        :editable="false" 
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-content {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
  
  .header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    margin-bottom: 16px;
    
    .title-section {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      
      .icon-wrapper {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        flex-shrink: 0;
      }
      
      .title-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        
        .page-title {
          margin: 0;
          font-size: 32px;
          font-weight: bold;
          line-height: 1.2;
          color: var(--color-text-heading);
        }

        .page-description {
          margin: 0;
          font-size: 16px;
          color: var(--color-text-muted);
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
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--n-border-color);

    .meta-info {
      display: flex;
      gap: 16px;
      align-items: center;
      
      .tags {
        display: flex;
        gap: 8px;
      }
    }
  }
}

.content-area {
  min-height: 400px;
}

.loading-state, .error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 400px;
}
</style>
