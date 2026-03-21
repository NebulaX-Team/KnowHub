<script setup lang="ts">
import { ref, onMounted, computed, h, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NCard,
  NDataTable,
  NButton,
  NSpace,
  NTag,
  NInput,
  NIcon,
  NSelect,
  NPopconfirm,
  NEmpty,
  NSpin,
  NEllipsis,
  NTooltip,
  NText,
  NStatistic,
  useMessage,
  type DataTableColumns,
  type PaginationProps
} from 'naive-ui'
import {
  SearchOutline,
  OpenOutline,
  TrashOutline,
  FolderOutline
} from '@vicons/ionicons5'
import { pageApi, type PageQueryParams } from '@/api/page'
import { libraryApi } from '@/api/library'
import type { Page, Library } from '@/types'

const router = useRouter()
const message = useMessage()
const { t } = useI18n()

const loading = ref(false)
const pages = ref<Page[]>([])
const libraries = ref<Library[]>([])
const searchQuery = ref('')
const filterLibraryId = ref<string | null>(null)
const sortBy = ref<PageQueryParams['sortBy']>('updatedAt')
const sortDirection = ref<PageQueryParams['sortDirection']>('DESC')

const pagination = ref<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: ({ itemCount }) => t('settingsPage.groups.pagination.total', { count: itemCount })
})

// Stats
const stats = computed(() => {
  return {
    total: pagination.value.itemCount || 0,
    publicCount: pages.value.filter(p => p.isPublic).length
  }
})

const libraryOptions = computed(() => {
  const options = [{ label: t('settingsPage.groups.filters.allLibraries'), value: '' }]
  libraries.value.forEach(lib => {
    options.push({ label: `${lib.icon || '📁'} ${lib.title}`, value: lib.id })
  })
  return options
})

const sortOptions = computed(() => [
  { label: t('settingsPage.groups.filters.sortLastUpdated'), value: 'updatedAt' },
  { label: t('settingsPage.groups.filters.sortCreatedDate'), value: 'createdAt' },
  { label: t('settingsPage.groups.filters.sortTitle'), value: 'title' },
  { label: t('settingsPage.groups.filters.sortLastViewed'), value: 'lastViewedAt' }
])

const filteredPages = computed(() => {
  if (!searchQuery.value) return pages.value
  const query = searchQuery.value.toLowerCase()
  return pages.value.filter(p =>
    p.title.toLowerCase().includes(query) ||
    (p.libraryTitle || '').toLowerCase().includes(query)
  )
})

const columns = computed<DataTableColumns<Page>>(() => [
  {
    title: t('settingsPage.groups.table.group'),
    key: 'title',
    minWidth: 200,
    render: (row) => {
      return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        row.icon
          ? h('span', { style: 'font-size: 16px; flex-shrink: 0;' }, row.icon)
          : h(NIcon, { size: 16, color: '#999' }, { default: () => h(FolderOutline) }),
        h('div', { style: 'min-width: 0;' }, [
          h(NEllipsis, { style: 'font-weight: 500;' }, { default: () => row.title || t('settingsPage.groups.table.untitled') })
        ])
      ])
    }
  },
  {
    title: t('settingsPage.groups.table.library'),
    key: 'libraryTitle',
    width: 160,
    render: (row) => {
      if (!row.libraryTitle) return h(NText, { depth: 3 }, { default: () => '-' })
      return h(NEllipsis, null, { default: () => row.libraryTitle })
    }
  },
  {
    title: t('settingsPage.groups.table.public'),
    key: 'isPublic',
    width: 80,
    align: 'center',
    render: (row) => h(NTag, {
      type: row.isPublic ? 'success' : 'default',
      size: 'small',
      bordered: false
    }, { default: () => row.isPublic ? t('common.status.yes') : t('common.status.no') })
  },
  {
    title: t('settingsPage.groups.table.created'),
    key: 'createdAt',
    width: 120,
    render: (row) => new Date(row.createdAt).toLocaleDateString()
  },
  {
    title: t('settingsPage.groups.table.updated'),
    key: 'updatedAt',
    width: 120,
    render: (row) => new Date(row.updatedAt).toLocaleDateString()
  },
  {
    title: t('settingsPage.groups.table.actions'),
    key: 'actions',
    width: 120,
    fixed: 'right',
    render: (row) => {
      const rowTitle = row.title || t('settingsPage.groups.table.untitled')
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NTooltip, null, {
            trigger: () => h(NButton, {
              size: 'small', quaternary: true, circle: true,
              onClick: () => navigateToPage(row)
            }, { icon: () => h(NIcon, { component: OpenOutline }) }),
            default: () => t('settingsPage.groups.openGroup')
          }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row),
            positiveText: t('common.actions.delete'),
            negativeText: t('common.actions.cancel')
          }, {
            default: () => t('settingsPage.groups.confirmDelete', { title: rowTitle }),
            trigger: () => h(NButton, {
              size: 'small', quaternary: true, circle: true, type: 'error'
            }, { icon: () => h(NIcon, { component: TrashOutline }) })
          })
        ]
      })
    }
  }
])

async function loadLibraries() {
  try {
    const response = await libraryApi.getLibraries()
    if (response.code === 0) {
      libraries.value = response.data
    }
  } catch {
    // silently fail — libraries are just for the filter
  }
}

async function loadPages() {
  loading.value = true
  try {
    const params: PageQueryParams = {
      page: pagination.value.page || 1,
      pageSize: pagination.value.pageSize || 20,
      nodeType: 'group',
      sortBy: sortBy.value,
      sortDirection: sortDirection.value
    }
    if (filterLibraryId.value) {
      params.libraryId = filterLibraryId.value
    }
    const response = await pageApi.getPages(params)
    if (response.code === 0) {
      pages.value = response.data.items
      pagination.value.itemCount = response.data.total
    } else {
      message.error(t('settingsPage.groups.messages.loadFailed'))
    }
  } catch {
    message.error(t('settingsPage.groups.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function handleDelete(page: Page) {
  try {
    const response = await pageApi.deletePage(page.id)
    if (response.code === 0) {
      message.success(t('settingsPage.groups.messages.deleteSuccess'))
      await loadPages()
    } else {
      message.error(t('settingsPage.groups.messages.deleteFailed'))
    }
  } catch {
    message.error(t('settingsPage.groups.messages.deleteFailed'))
  }
}

function navigateToPage(page: Page) {
  router.push(`/page/${page.id}`)
}

function handlePageChange(page: number) {
  pagination.value.page = page
  loadPages()
}

function handlePageSizeChange(size: number) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadPages()
}

// Watch filter changes
watch([filterLibraryId, sortBy, sortDirection], () => {
  pagination.value.page = 1
  loadPages()
})

onMounted(() => {
  loadLibraries()
  loadPages()
})
</script>

<template>
  <div class="settings-page">
    <div class="header">
      <div>
        <h2>{{ t('settingsPage.groups.title') }}</h2>
        <p class="description">{{ t('settingsPage.groups.description') }}</p>
      </div>
    </div>

    <div class="stats-row">
      <NCard size="small" class="stat-card">
        <NStatistic :label="t('settingsPage.groups.stats.totalGroups')" :value="stats.total" />
      </NCard>
      <NCard size="small" class="stat-card">
        <NStatistic :label="t('settingsPage.groups.stats.publicGroups')" :value="stats.publicCount" />
      </NCard>
    </div>

    <NCard class="content-card">
      <div class="toolbar">
        <NSpace justify="space-between" align="center" style="flex-wrap: wrap; gap: 12px">
          <NSpace style="flex-wrap: wrap; gap: 8px">
            <NInput
              v-model:value="searchQuery"
              :placeholder="t('settingsPage.groups.searchPlaceholder')"
              clearable
              style="width: 240px"
            >
              <template #prefix>
                <NIcon :component="SearchOutline" />
              </template>
            </NInput>
            <NSelect
              v-model:value="filterLibraryId"
              :options="libraryOptions"
              :placeholder="t('settingsPage.groups.filters.filterByLibrary')"
              clearable
              style="width: 200px"
            />
            <NSelect
              v-model:value="sortBy"
              :options="sortOptions"
              style="width: 160px"
            />
            <NButton
              secondary
              size="small"
              @click="sortDirection = sortDirection === 'ASC' ? 'DESC' : 'ASC'"
              style="min-width: 40px"
            >
              {{ sortDirection === 'ASC' ? '↑' : '↓' }}
            </NButton>
          </NSpace>
          <NButton @click="loadPages" :loading="loading" secondary>
            {{ t('common.actions.refresh') }}
          </NButton>
        </NSpace>
      </div>

      <NSpin :show="loading">
        <div v-if="filteredPages.length === 0 && !loading" class="empty-state">
          <NEmpty :description="t('settingsPage.groups.noGroups')">
            <template #extra>
              <NText depth="3">
                {{ searchQuery || filterLibraryId
                  ? t('settingsPage.groups.emptyAdjust')
                  : t('settingsPage.groups.emptyCreateHint') }}
              </NText>
            </template>
          </NEmpty>
        </div>

        <NDataTable
          v-else
          :columns="columns"
          :data="filteredPages"
          :bordered="false"
          :pagination="pagination"
          :remote="true"
          striped
          :scroll-x="700"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  margin-bottom: 24px;

  h2 {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .description {
    margin: 0;
    color: var(--n-text-color-3);
    font-size: 14px;
  }
}

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;

  .stat-card {
    flex: 1;
    max-width: 200px;
  }
}

.content-card {
  min-height: 300px;
}

.toolbar {
  margin-bottom: 20px;
}

.empty-state {
  padding: 60px 20px;
  display: flex;
  justify-content: center;
}
</style>
