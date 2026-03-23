<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NIcon,
  NInput,
  NPopconfirm,
  NSelect,
  NSpace,
  NSpin,
  NStatistic,
  NText,
  NTooltip,
  useMessage,
  type DataTableColumns,
  type PaginationProps,
} from 'naive-ui'
import {
  ArchiveOutline,
  ReturnUpBackOutline,
  SearchOutline,
  TrashOutline,
  FolderOutline,
  DocumentTextOutline,
} from '@vicons/ionicons5'
import { pageApi, type ArchivedQueryParams } from '@/api/page'
import { libraryApi } from '@/api/library'
import { useSystemStore } from '@/stores/system'
import { formatDateByOffset } from '@/utils/datetime'
import type { Library, Page } from '@/types'

const systemStore = useSystemStore()
const { t, locale } = useI18n()
const message = useMessage()

const loading = ref(false)
const archivedPages = ref<Page[]>([])
const libraries = ref<Library[]>([])
const searchQuery = ref('')
const filterLibraryId = ref<string | null>(null)
const filterType = ref<'all' | 'page' | 'group'>('all')
const sortBy = ref<ArchivedQueryParams['sortBy']>('archivedAt')
const sortDirection = ref<ArchivedQueryParams['sortDirection']>('DESC')

const pagination = ref<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: ({ itemCount }) => t('settingsPage.archived.pagination.total', { count: itemCount }),
})

const stats = computed(() => {
  return {
    total: pagination.value.itemCount || 0,
    pages: archivedPages.value.filter(item => item.type === 'page').length,
    groups: archivedPages.value.filter(item => item.type === 'group').length,
  }
})

const libraryOptions = computed(() => {
  const options = [{ label: t('settingsPage.archived.filters.allLibraries'), value: '' }]
  libraries.value.forEach(lib => {
    options.push({ label: `${lib.icon || '📁'} ${lib.title}`, value: lib.id })
  })
  return options
})

const typeOptions = computed(() => [
  { label: t('settingsPage.archived.filters.allTypes'), value: 'all' },
  { label: t('settingsPage.archived.filters.pageType'), value: 'page' },
  { label: t('settingsPage.archived.filters.groupType'), value: 'group' },
])

const filteredItems = computed(() => {
  if (!searchQuery.value) return archivedPages.value
  const query = searchQuery.value.toLowerCase()
  return archivedPages.value.filter(item =>
    item.title.toLowerCase().includes(query) ||
    (item.libraryTitle || '').toLowerCase().includes(query),
  )
})

const columns = computed<DataTableColumns<Page>>(() => [
  {
    title: t('settingsPage.archived.table.item'),
    key: 'title',
    minWidth: 220,
    render: (row) => {
      return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        row.icon
          ? h('span', { style: 'font-size: 16px; flex-shrink: 0;' }, row.icon)
          : h(NIcon, { size: 16, color: '#999' }, { default: () => h(row.type === 'group' ? FolderOutline : DocumentTextOutline) }),
        h('div', { style: 'min-width: 0;' }, [
          h('div', { style: 'font-weight: 500;' }, row.title || t('settingsPage.archived.table.untitled')),
          h(
            NText,
            { depth: 3, style: 'font-size: 12px;' },
            { default: () => row.type === 'group' ? t('settingsPage.archived.filters.groupType') : t('settingsPage.archived.filters.pageType') },
          ),
        ]),
      ])
    },
  },
  {
    title: t('settingsPage.archived.table.library'),
    key: 'libraryTitle',
    width: 180,
    render: (row) => row.libraryTitle || '-',
  },
  {
    title: t('settingsPage.archived.table.archivedAt'),
    key: 'archivedAt',
    width: 160,
    render: (row) => formatDate(row.archivedAt || row.updatedAt),
  },
  {
    title: t('settingsPage.archived.table.actions'),
    key: 'actions',
    width: 150,
    fixed: 'right',
    render: (row) => {
      const rowTitle = row.title || t('settingsPage.archived.table.untitled')
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NTooltip, null, {
            trigger: () => h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                circle: true,
                type: 'success',
                onClick: () => handleRestore(row.id),
              },
              { icon: () => h(NIcon, { component: ReturnUpBackOutline }) },
            ),
            default: () => t('settingsPage.archived.actions.restore'),
          }),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handlePermanentDelete(row.id),
              positiveText: t('common.actions.delete'),
              negativeText: t('common.actions.cancel'),
            },
            {
              default: () => t('settingsPage.archived.confirmPermanentDelete', { title: rowTitle }),
              trigger: () => h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  circle: true,
                  type: 'error',
                },
                { icon: () => h(NIcon, { component: TrashOutline }) },
              ),
            },
          ),
        ],
      })
    },
  },
])

async function loadLibraries() {
  try {
    const response = await libraryApi.getLibraries()
    if (response.code === 0) {
      libraries.value = response.data
    }
  } catch {
    // library filter is optional
  }
}

async function loadArchived() {
  loading.value = true
  try {
    const params: ArchivedQueryParams = {
      page: pagination.value.page || 1,
      pageSize: pagination.value.pageSize || 20,
      sortBy: sortBy.value,
      sortDirection: sortDirection.value,
      nodeType: filterType.value,
    }
    if (filterLibraryId.value) {
      params.libraryId = filterLibraryId.value
    }

    const response = await pageApi.getArchivedPages(params)
    if (response.code === 0) {
      archivedPages.value = response.data.items
      pagination.value.itemCount = response.data.total
      return
    }
  } catch {
    // handled below
  } finally {
    loading.value = false
  }

  message.error(t('settingsPage.archived.messages.loadFailed'))
}

async function handleRestore(id: string) {
  try {
    const response = await pageApi.unarchivePage(id)
    if (response.code === 0) {
      message.success(t('settingsPage.archived.messages.restoreSuccess'))
      await loadArchived()
      return
    }
  } catch {
    // handled below
  }
  message.error(t('settingsPage.archived.messages.restoreFailed'))
}

async function handlePermanentDelete(id: string) {
  try {
    const response = await pageApi.deletePagePermanent(id)
    if (response.code === 0) {
      message.success(t('settingsPage.archived.messages.permanentDeleteSuccess'))
      await loadArchived()
      return
    }
  } catch {
    // handled below
  }
  message.error(t('settingsPage.archived.messages.permanentDeleteFailed'))
}

function handlePageChange(page: number) {
  pagination.value.page = page
  loadArchived()
}

function handlePageSizeChange(size: number) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadArchived()
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return formatDateByOffset(value, systemStore.siteTimezone, locale.value)
}

watch([filterLibraryId, filterType, sortBy, sortDirection], () => {
  pagination.value.page = 1
  loadArchived()
})

onMounted(() => {
  loadLibraries()
  loadArchived()
})
</script>

<template>
  <div class="settings-page">
    <div class="header">
      <div>
        <h2>{{ t('settingsPage.archived.title') }}</h2>
        <p class="description">{{ t('settingsPage.archived.description') }}</p>
      </div>
    </div>

    <div class="stats-row">
      <NCard size="small" class="stat-card">
        <NStatistic :label="t('settingsPage.archived.stats.totalItems')" :value="stats.total" />
      </NCard>
      <NCard size="small" class="stat-card">
        <NStatistic :label="t('settingsPage.archived.stats.totalPages')" :value="stats.pages" />
      </NCard>
      <NCard size="small" class="stat-card">
        <NStatistic :label="t('settingsPage.archived.stats.totalGroups')" :value="stats.groups" />
      </NCard>
    </div>

    <NCard class="content-card">
      <div class="toolbar">
        <NSpace justify="space-between" align="center" style="flex-wrap: wrap; gap: 12px">
          <NSpace style="flex-wrap: wrap; gap: 8px">
            <NInput
              v-model:value="searchQuery"
              :placeholder="t('settingsPage.archived.searchPlaceholder')"
              clearable
              style="width: 220px"
            >
              <template #prefix>
                <NIcon :component="SearchOutline" />
              </template>
            </NInput>
            <NSelect
              v-model:value="filterLibraryId"
              :options="libraryOptions"
              :placeholder="t('settingsPage.archived.filters.filterByLibrary')"
              clearable
              style="width: 200px"
            />
            <NSelect
              v-model:value="filterType"
              :options="typeOptions"
              style="width: 160px"
            />
          </NSpace>
          <NButton @click="loadArchived" :loading="loading" secondary>
            <template #icon><NIcon :component="ArchiveOutline" /></template>
            {{ t('common.actions.refresh') }}
          </NButton>
        </NSpace>
      </div>

      <NSpin :show="loading">
        <div v-if="filteredItems.length === 0 && !loading" class="empty-state">
          <NEmpty :description="t('settingsPage.archived.noItems')">
            <template #extra>
              <NText depth="3">
                {{ searchQuery || filterLibraryId || filterType !== 'all'
                  ? t('settingsPage.archived.emptyAdjust')
                  : t('settingsPage.archived.emptyHint') }}
              </NText>
            </template>
          </NEmpty>
        </div>

        <NDataTable
          v-else
          :columns="columns"
          :data="filteredItems"
          :bordered="false"
          :pagination="pagination"
          :remote="true"
          striped
          :scroll-x="760"
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
    min-width: 0;
  }
}

.content-card {
  min-height: 300px;
}

.toolbar {
  margin-bottom: 16px;
}

.empty-state {
  padding: 60px 0;
}

@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }

  .stats-row {
    flex-direction: column;
  }
}
</style>
