<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
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
  NPopconfirm,
  NModal,
  NForm,
  NFormItem,
  NSwitch,
  NEmpty,
  NSpin,
  NEllipsis,
  NTooltip,
  NText,
  useMessage,
  type DataTableColumns,
  type FormInst
} from 'naive-ui'
import {
  SearchOutline,
  AddOutline,
  CreateOutline,
  TrashOutline,
  OpenOutline,
  LibraryOutline
} from '@vicons/ionicons5'
import { libraryApi, type CreateLibraryRequest, type UpdateLibraryRequest } from '@/api/library'
import type { Library } from '@/types'
import { useLibraryStore } from '@/stores/library'
import { useSystemStore } from '@/stores/system'
import { formatDateByOffset } from '@/utils/datetime'

const router = useRouter()
const message = useMessage()
const libraryStore = useLibraryStore()
const systemStore = useSystemStore()
const { t, locale } = useI18n()

const loading = ref(false)
const libraries = ref<Library[]>([])
const searchQuery = ref('')

// Modal state
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingLibraryId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)
const formLoading = ref(false)
const formModel = ref({
  title: '',
  description: '',
  icon: '',
  isPublic: false
})

const formRules = computed(() => ({
  title: { required: true, message: t('settingsPage.libraries.validation.nameRequired'), trigger: 'blur' }
}))

const filteredLibraries = computed(() => {
  if (!searchQuery.value) return libraries.value
  const query = searchQuery.value.toLowerCase()
  return libraries.value.filter(lib =>
    lib.title.toLowerCase().includes(query) ||
    (lib.description || '').toLowerCase().includes(query)
  )
})

const columns = computed<DataTableColumns<Library>>(() => [
  {
    title: t('settingsPage.libraries.table.library'),
    key: 'title',
    minWidth: 200,
    render: (row) => {
      return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        row.icon
          ? h('span', { style: 'font-size: 18px; flex-shrink: 0;' }, row.icon)
          : h(NIcon, { size: 18, color: '#999' }, { default: () => h(LibraryOutline) }),
        h('div', { style: 'min-width: 0;' }, [
          h(NEllipsis, { style: 'font-weight: 500;' }, { default: () => row.title }),
          row.description
            ? h(NText, { depth: 3, style: 'font-size: 12px; display: block;' }, {
                default: () => h(NEllipsis, { lineClamp: 1 }, { default: () => row.description })
              })
            : null
        ])
      ])
    }
  },
  {
    title: t('settingsPage.libraries.table.pages'),
    key: 'pageCount',
    width: 80,
    align: 'center',
    render: (row) => h(NTag, { size: 'small', round: true, bordered: false }, { default: () => String(row.pageCount ?? 0) })
  },
  {
    title: t('settingsPage.libraries.table.public'),
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
    title: t('settingsPage.libraries.table.created'),
    key: 'createdAt',
    width: 140,
    render: (row) => formatDateByOffset(row.createdAt, systemStore.siteTimezone, locale.value)
  },
  {
    title: t('settingsPage.libraries.table.updated'),
    key: 'updatedAt',
    width: 140,
    render: (row) => formatDateByOffset(row.updatedAt, systemStore.siteTimezone, locale.value)
  },
  {
    title: t('settingsPage.libraries.table.actions'),
    key: 'actions',
    width: 160,
    fixed: 'right',
    render: (row) => {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NTooltip, null, {
            trigger: () => h(NButton, {
              size: 'small', quaternary: true, circle: true,
              onClick: () => navigateToLibrary(row)
            }, { icon: () => h(NIcon, { component: OpenOutline }) }),
            default: () => t('settingsPage.libraries.tooltips.openLibrary')
          }),
          h(NTooltip, null, {
            trigger: () => h(NButton, {
              size: 'small', quaternary: true, circle: true,
              onClick: () => openEditModal(row)
            }, { icon: () => h(NIcon, { component: CreateOutline }) }),
            default: () => t('common.actions.edit')
          }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row.id),
            positiveText: t('common.actions.delete'),
            negativeText: t('common.actions.cancel')
          }, {
            default: () => t('settingsPage.libraries.confirmDelete', { title: row.title }),
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
  loading.value = true
  try {
    const response = await libraryApi.getLibraries()
    if (response.code === 0) {
      libraries.value = response.data
    } else {
      message.error(t('settingsPage.libraries.messages.loadFailed'))
    }
  } catch {
    message.error(t('settingsPage.libraries.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  modalMode.value = 'create'
  editingLibraryId.value = null
  formModel.value = { title: '', description: '', icon: '', isPublic: false }
  showModal.value = true
}

function openEditModal(lib: Library) {
  modalMode.value = 'edit'
  editingLibraryId.value = lib.id
  formModel.value = {
    title: lib.title,
    description: lib.description || '',
    icon: lib.icon || '',
    isPublic: lib.isPublic
  }
  showModal.value = true
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  formLoading.value = true
  try {
    if (modalMode.value === 'create') {
      const data: CreateLibraryRequest = {
        title: formModel.value.title,
        description: formModel.value.description || undefined,
        icon: formModel.value.icon || undefined,
        isPublic: formModel.value.isPublic,
        content: { type: 'doc', content: [] }
      }
      const response = await libraryApi.createLibrary(data)
      if (response.code === 0) {
        message.success(t('settingsPage.libraries.messages.createSuccess'))
        showModal.value = false
        await loadLibraries()
        // Refresh the library store so sidebar updates
        await libraryStore.fetchLibraries()
      } else {
        message.error(t('settingsPage.libraries.messages.createFailed'))
      }
    } else if (editingLibraryId.value) {
      const data: UpdateLibraryRequest = {
        title: formModel.value.title,
        description: formModel.value.description || undefined,
        icon: formModel.value.icon || undefined,
        isPublic: formModel.value.isPublic
      }
      const response = await libraryApi.updateLibrary(editingLibraryId.value, data)
      if (response.code === 0) {
        message.success(t('settingsPage.libraries.messages.updateSuccess'))
        showModal.value = false
        await loadLibraries()
        await libraryStore.fetchLibraries()
      } else {
        message.error(t('settingsPage.libraries.messages.updateFailed'))
      }
    }
  } catch {
    message.error(t('common.messages.operationFailed'))
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: string) {
  try {
    const response = await libraryApi.deleteLibrary(id)
    if (response.code === 0) {
      message.success(t('settingsPage.libraries.messages.deleteSuccess'))
      await loadLibraries()
      await libraryStore.fetchLibraries()
    } else {
      message.error(t('settingsPage.libraries.messages.deleteFailed'))
    }
  } catch {
    message.error(t('settingsPage.libraries.messages.deleteFailed'))
  }
}

function navigateToLibrary(lib: Library) {
  router.push(`/library/${lib.id}`)
}

onMounted(() => {
  loadLibraries()
})
</script>

<template>
  <div class="settings-page">
    <div class="header">
      <div>
        <h2>{{ t('settingsPage.libraries.title') }}</h2>
        <p class="description">{{ t('settingsPage.libraries.description') }}</p>
      </div>
    </div>

    <NCard class="content-card">
      <div class="toolbar">
        <NSpace justify="space-between" align="center" style="flex-wrap: wrap; gap: 12px">
          <NInput
            v-model:value="searchQuery"
            :placeholder="t('settingsPage.libraries.searchPlaceholder')"
            clearable
            style="width: 280px"
          >
            <template #prefix>
              <NIcon :component="SearchOutline" />
            </template>
          </NInput>
          <NSpace>
            <NButton @click="loadLibraries" :loading="loading" secondary>
              {{ t('settingsPage.libraries.buttons.refresh') }}
            </NButton>
            <NButton type="primary" @click="openCreateModal">
              <template #icon><NIcon :component="AddOutline" /></template>
              {{ t('settingsPage.libraries.buttons.newLibrary') }}
            </NButton>
          </NSpace>
        </NSpace>
      </div>

      <NSpin :show="loading">
        <div v-if="filteredLibraries.length === 0 && !loading" class="empty-state">
          <NEmpty :description="t('settingsPage.libraries.noLibraries')">
            <template #extra>
              <NButton type="primary" size="small" @click="openCreateModal">
                {{ t('settingsPage.libraries.createFirst') }}
              </NButton>
            </template>
          </NEmpty>
        </div>

        <NDataTable
          v-else
          :columns="columns"
          :data="filteredLibraries"
          :bordered="false"
          striped
          :scroll-x="700"
        />
      </NSpin>
    </NCard>

    <!-- Create / Edit Modal -->
    <NModal
      v-model:show="showModal"
      :title="modalMode === 'create' ? t('settingsPage.libraries.modal.createTitle') : t('settingsPage.libraries.modal.editTitle')"
      preset="dialog"
      :positive-text="modalMode === 'create' ? t('settingsPage.libraries.buttons.create') : t('settingsPage.libraries.buttons.save')"
      :negative-text="t('common.actions.cancel')"
      :loading="formLoading"
      @positive-click="handleSubmit"
      style="width: 480px"
    >
      <NForm
        ref="formRef"
        :model="formModel"
        :rules="formRules"
        label-placement="left"
        label-width="auto"
        style="margin-top: 16px"
      >
        <NFormItem :label="t('settingsPage.libraries.form.name')" path="title">
          <NInput v-model:value="formModel.title" :placeholder="t('settingsPage.libraries.placeholders.name')" />
        </NFormItem>
        <NFormItem :label="t('settingsPage.libraries.form.description')" path="description">
          <NInput
            v-model:value="formModel.description"
            type="textarea"
            :placeholder="t('settingsPage.libraries.placeholders.description')"
            :rows="2"
          />
        </NFormItem>
        <NFormItem :label="t('settingsPage.libraries.form.icon')" path="icon">
          <NInput v-model:value="formModel.icon" :placeholder="t('settingsPage.libraries.placeholders.icon')" />
        </NFormItem>
        <NFormItem :label="t('settingsPage.libraries.form.public')" path="isPublic">
          <NSwitch v-model:value="formModel.isPublic" />
        </NFormItem>
      </NForm>
    </NModal>
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
