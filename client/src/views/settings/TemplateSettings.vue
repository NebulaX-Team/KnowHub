<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPopconfirm,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NStatistic,
  NTag,
  NText,
  NTooltip,
  useMessage,
  type DataTableColumns,
  type FormInst,
} from 'naive-ui'
import {
  AddOutline,
  CopyOutline,
  CreateOutline,
  SearchOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  templateApi,
  type CreateTemplateRequest,
  type UpdateTemplateRequest,
} from '@/api/template'
import { useSystemStore } from '@/stores/system'
import { formatDateByOffset } from '@/utils/datetime'
import type { Template } from '@/types'
import TiptapEditor from '@/components/editor/TiptapEditor.vue'

const systemStore = useSystemStore()
const { t, locale } = useI18n()
const message = useMessage()

const loading = ref(false)
const templates = ref<Template[]>([])
const searchQuery = ref('')
const filterCategory = ref<string | null>(null)

const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingTemplateId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)
const formLoading = ref(false)
const contentMode = ref<'visual' | 'json'>('visual')
const templateEditorKey = ref(0)

const DEFAULT_TEMPLATE_CONTENT: Record<string, unknown> = {
  type: 'doc',
  content: [],
}

const formModel = ref({
  title: '',
  description: '',
  category: '',
  content: deepClone(DEFAULT_TEMPLATE_CONTENT),
  contentText: JSON.stringify(DEFAULT_TEMPLATE_CONTENT, null, 2),
})

const stats = computed(() => {
  const builtInCount = templates.value.filter(item => item.isBuiltIn).length
  return {
    total: templates.value.length,
    builtIn: builtInCount,
    custom: templates.value.length - builtInCount,
  }
})

const formRules = computed(() => ({
  title: {
    required: true,
    message: t('settingsPage.templates.validation.nameRequired'),
    trigger: 'blur',
  },
}))

const categoryOptions = computed(() => {
  const options = [{ label: t('settingsPage.templates.filters.allCategories'), value: '' }]
  const categorySet = new Set<string>()

  templates.value.forEach(item => {
    const category = (item.category || '').trim()
    if (category) {
      categorySet.add(category)
    }
  })

  Array.from(categorySet)
    .sort((a, b) => a.localeCompare(b))
    .forEach(category => {
      options.push({ label: category, value: category })
    })

  return options
})

const filteredTemplates = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  const category = filterCategory.value?.trim()

  return templates.value.filter((item) => {
    const matchesKeyword = !keyword
      || item.title.toLowerCase().includes(keyword)
      || (item.description || '').toLowerCase().includes(keyword)
    const matchesCategory = !category || (item.category || '') === category
    return matchesKeyword && matchesCategory
  })
})

const columns = computed<DataTableColumns<Template>>(() => [
  {
    title: t('settingsPage.templates.table.template'),
    key: 'title',
    minWidth: 220,
    render: (row) => {
      return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        h(NIcon, { size: 16, color: '#999' }, { default: () => h(CopyOutline) }),
        h('div', { style: 'min-width: 0;' }, [
          h('div', { style: 'font-weight: 500;' }, row.title),
          row.description
            ? h(NText, { depth: 3, style: 'font-size: 12px; display: block;' }, { default: () => row.description })
            : null,
        ]),
      ])
    },
  },
  {
    title: t('settingsPage.templates.table.category'),
    key: 'category',
    width: 160,
    render: (row) => {
      if (!row.category) {
        return h(NText, { depth: 3 }, { default: () => '-' })
      }
      return h(NTag, { size: 'small', bordered: false }, { default: () => row.category as string })
    },
  },
  {
    title: t('settingsPage.templates.table.source'),
    key: 'isBuiltIn',
    width: 120,
    align: 'center',
    render: (row) =>
      h(
        NTag,
        {
          type: row.isBuiltIn ? 'success' : 'default',
          size: 'small',
          bordered: false,
        },
        {
          default: () =>
            row.isBuiltIn
              ? t('settingsPage.templates.table.sourceBuiltIn')
              : t('settingsPage.templates.table.sourceCustom'),
        },
      ),
  },
  {
    title: t('settingsPage.templates.table.updated'),
    key: 'updatedAt',
    width: 140,
    render: (row) => formatDate(row.updatedAt),
  },
  {
    title: t('settingsPage.templates.table.actions'),
    key: 'actions',
    width: 170,
    fixed: 'right',
    render: (row) => {
      const rowTitle = row.title
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NTooltip, null, {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  circle: true,
                  onClick: () => handleDuplicate(row.id),
                },
                { icon: () => h(NIcon, { component: CopyOutline }) },
              ),
            default: () => t('settingsPage.templates.tooltips.duplicate'),
          }),
          !row.isBuiltIn
            ? h(NTooltip, null, {
                trigger: () =>
                  h(
                    NButton,
                    {
                      size: 'small',
                      quaternary: true,
                      circle: true,
                      onClick: () => openEditModal(row),
                    },
                    { icon: () => h(NIcon, { component: CreateOutline }) },
                  ),
                default: () => t('common.actions.edit'),
              })
            : null,
          !row.isBuiltIn
            ? h(
                NPopconfirm,
                {
                  onPositiveClick: () => handleDelete(row.id),
                  positiveText: t('common.actions.delete'),
                  negativeText: t('common.actions.cancel'),
                },
                {
                  default: () => t('settingsPage.templates.confirmDelete', { title: rowTitle }),
                  trigger: () =>
                    h(
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
              )
            : h(NText, { depth: 3, style: 'font-size: 12px;' }, { default: () => t('settingsPage.templates.badges.readOnly') }),
        ],
      })
    },
  },
])

watch(contentMode, (nextMode, prevMode) => {
  if (nextMode === 'json') {
    syncContentTextFromContent()
    return
  }

  if (prevMode === 'json') {
    const success = syncContentFromJsonText()
    if (!success) {
      contentMode.value = 'json'
    }
  }
})

async function loadTemplates() {
  loading.value = true
  try {
    const response = await templateApi.getTemplates()
    if (response.code === 0) {
      templates.value = response.data
      return
    }
  } catch {
    // handled below
  } finally {
    loading.value = false
  }
  message.error(t('settingsPage.templates.messages.loadFailed'))
}

function openCreateModal() {
  modalMode.value = 'create'
  editingTemplateId.value = null
  contentMode.value = 'visual'

  const content = deepClone(DEFAULT_TEMPLATE_CONTENT)
  formModel.value = {
    title: '',
    description: '',
    category: '',
    content,
    contentText: JSON.stringify(content, null, 2),
  }

  templateEditorKey.value += 1
  showModal.value = true
}

function openEditModal(template: Template) {
  modalMode.value = 'edit'
  editingTemplateId.value = template.id
  contentMode.value = 'visual'

  const content = sanitizeTemplateContent(template.content)
  formModel.value = {
    title: template.title,
    description: template.description || '',
    category: template.category || '',
    content,
    contentText: JSON.stringify(content, null, 2),
  }

  templateEditorKey.value += 1
  showModal.value = true
}

function handleEditorUpdate(content: any) {
  formModel.value.content = sanitizeTemplateContent(content)
  syncContentTextFromContent()
}

function handleJsonBlur() {
  if (contentMode.value !== 'json') return
  syncContentFromJsonText()
}

function syncContentTextFromContent() {
  formModel.value.contentText = JSON.stringify(
    sanitizeTemplateContent(formModel.value.content),
    null,
    2,
  )
}

function syncContentFromJsonText() {
  try {
    const parsed = JSON.parse(formModel.value.contentText)
    formModel.value.content = sanitizeTemplateContent(parsed)
    syncContentTextFromContent()
    return true
  } catch {
    message.error(t('settingsPage.templates.validation.contentInvalid'))
    return false
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  if (contentMode.value === 'json' && !syncContentFromJsonText()) {
    return
  }

  const normalizedContent = sanitizeTemplateContent(formModel.value.content)

  formLoading.value = true
  try {
    if (modalMode.value === 'create') {
      const payload: CreateTemplateRequest = {
        title: formModel.value.title.trim(),
        description: formModel.value.description.trim() || undefined,
        category: formModel.value.category.trim() || undefined,
        content: normalizedContent,
      }
      const response = await templateApi.createTemplate(payload)
      if (response.code === 0) {
        message.success(t('settingsPage.templates.messages.createSuccess'))
        showModal.value = false
        await loadTemplates()
      } else {
        message.error(t('settingsPage.templates.messages.createFailed'))
      }
    } else if (editingTemplateId.value) {
      const payload: UpdateTemplateRequest = {
        title: formModel.value.title.trim(),
        description: formModel.value.description.trim() || undefined,
        category: formModel.value.category.trim() || undefined,
        content: normalizedContent,
      }
      const response = await templateApi.updateTemplate(editingTemplateId.value, payload)
      if (response.code === 0) {
        message.success(t('settingsPage.templates.messages.updateSuccess'))
        showModal.value = false
        await loadTemplates()
      } else {
        message.error(t('settingsPage.templates.messages.updateFailed'))
      }
    }
  } catch {
    const failKey = modalMode.value === 'create'
      ? 'settingsPage.templates.messages.createFailed'
      : 'settingsPage.templates.messages.updateFailed'
    message.error(t(failKey))
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: string) {
  try {
    const response = await templateApi.deleteTemplate(id)
    if (response.code === 0) {
      message.success(t('settingsPage.templates.messages.deleteSuccess'))
      await loadTemplates()
      return
    }
  } catch {
    // handled below
  }
  message.error(t('settingsPage.templates.messages.deleteFailed'))
}

async function handleDuplicate(id: string) {
  try {
    const response = await templateApi.duplicateTemplate(id)
    if (response.code === 0) {
      message.success(t('settingsPage.templates.messages.duplicateSuccess'))
      await loadTemplates()
      return
    }
  } catch {
    // handled below
  }
  message.error(t('settingsPage.templates.messages.duplicateFailed'))
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function sanitizeTemplateContent(content: unknown): Record<string, unknown> {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return deepClone(DEFAULT_TEMPLATE_CONTENT)
  }

  const source = content as Record<string, unknown>
  const next: Record<string, unknown> = {
    ...source,
  }

  if (next.type !== 'doc') {
    next.type = 'doc'
  }

  if (!Array.isArray(next.content)) {
    next.content = []
  }

  return deepClone(next)
}

function formatDate(value?: string) {
  if (!value) return '-'
  return formatDateByOffset(value, systemStore.siteTimezone, locale.value)
}

onMounted(() => {
  loadTemplates()
})
</script>

<template>
  <div class="settings-page">
    <div class="header">
      <div>
        <h2>{{ t('settingsPage.templates.title') }}</h2>
        <p class="description">{{ t('settingsPage.templates.description') }}</p>
      </div>
    </div>

    <div class="stats-row">
      <NCard size="small" class="stat-card">
        <NStatistic :label="t('settingsPage.templates.stats.totalTemplates')" :value="stats.total" />
      </NCard>
      <NCard size="small" class="stat-card">
        <NStatistic :label="t('settingsPage.templates.stats.builtInTemplates')" :value="stats.builtIn" />
      </NCard>
      <NCard size="small" class="stat-card">
        <NStatistic :label="t('settingsPage.templates.stats.customTemplates')" :value="stats.custom" />
      </NCard>
    </div>

    <NCard class="content-card">
      <div class="toolbar">
        <NSpace justify="space-between" align="center" style="flex-wrap: wrap; gap: 12px">
          <NSpace style="flex-wrap: wrap; gap: 8px">
            <NInput
              v-model:value="searchQuery"
              :placeholder="t('settingsPage.templates.searchPlaceholder')"
              clearable
              style="width: 240px"
            >
              <template #prefix>
                <NIcon :component="SearchOutline" />
              </template>
            </NInput>
            <NSelect
              v-model:value="filterCategory"
              :options="categoryOptions"
              :placeholder="t('settingsPage.templates.filters.filterByCategory')"
              clearable
              style="width: 220px"
            />
          </NSpace>
          <NSpace>
            <NButton @click="loadTemplates" :loading="loading" secondary>
              {{ t('common.actions.refresh') }}
            </NButton>
            <NButton type="primary" @click="openCreateModal">
              <template #icon><NIcon :component="AddOutline" /></template>
              {{ t('settingsPage.templates.buttons.newTemplate') }}
            </NButton>
          </NSpace>
        </NSpace>
      </div>

      <NSpin :show="loading">
        <div v-if="filteredTemplates.length === 0 && !loading" class="empty-state">
          <NEmpty :description="t('settingsPage.templates.noTemplates')">
            <template #extra>
              <NText depth="3">
                {{ searchQuery || filterCategory
                  ? t('settingsPage.templates.emptyAdjust')
                  : t('settingsPage.templates.emptyCreateHint') }}
              </NText>
            </template>
          </NEmpty>
        </div>

        <NDataTable
          v-else
          :columns="columns"
          :data="filteredTemplates"
          :bordered="false"
          striped
          :scroll-x="860"
        />
      </NSpin>
    </NCard>

    <NModal v-model:show="showModal">
      <NCard
        style="width: min(1100px, 96vw)"
        :title="modalMode === 'create'
          ? t('settingsPage.templates.modal.createTitle')
          : t('settingsPage.templates.modal.editTitle')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <NForm ref="formRef" :model="formModel" :rules="formRules">
          <NFormItem path="title" :label="t('settingsPage.templates.form.name')">
            <NInput
              v-model:value="formModel.title"
              :placeholder="t('settingsPage.templates.placeholders.name')"
            />
          </NFormItem>
          <NFormItem :label="t('settingsPage.templates.form.description')">
            <NInput
              v-model:value="formModel.description"
              type="textarea"
              :placeholder="t('settingsPage.templates.placeholders.description')"
              :autosize="{ minRows: 2, maxRows: 4 }"
            />
          </NFormItem>
          <NFormItem :label="t('settingsPage.templates.form.category')">
            <NInput
              v-model:value="formModel.category"
              :placeholder="t('settingsPage.templates.placeholders.category')"
            />
          </NFormItem>

          <NFormItem :label="t('settingsPage.templates.form.content')">
            <div class="content-editor-section">
              <NRadioGroup v-model:value="contentMode" size="small">
                <NRadioButton value="visual">{{ t('settingsPage.templates.editor.modeVisual') }}</NRadioButton>
                <NRadioButton value="json">{{ t('settingsPage.templates.editor.modeJson') }}</NRadioButton>
              </NRadioGroup>

              <p class="content-editor-tip">{{ t('settingsPage.templates.editor.tip') }}</p>

              <div v-if="contentMode === 'visual'" class="visual-editor-wrapper">
                <TiptapEditor
                  :key="templateEditorKey"
                  :content="formModel.content"
                  :editable="true"
                  @update="handleEditorUpdate"
                />
              </div>

              <NInput
                v-else
                v-model:value="formModel.contentText"
                type="textarea"
                :placeholder="t('settingsPage.templates.placeholders.content')"
                :autosize="{ minRows: 14, maxRows: 20 }"
                @blur="handleJsonBlur"
              />
            </div>
          </NFormItem>
        </NForm>

        <template #footer>
          <NSpace justify="end">
            <NButton @click="showModal = false">{{ t('common.actions.cancel') }}</NButton>
            <NButton type="primary" :loading="formLoading" @click="handleSubmit">
              {{ modalMode === 'create'
                ? t('settingsPage.templates.buttons.create')
                : t('settingsPage.templates.buttons.save') }}
            </NButton>
          </NSpace>
        </template>
      </NCard>
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

.content-editor-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.content-editor-tip {
  margin: 0;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.visual-editor-wrapper {
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 12px;
  min-height: 420px;
  max-height: 560px;
  overflow: auto;
}

@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }

  .stats-row {
    flex-direction: column;
  }

  .visual-editor-wrapper {
    min-height: 320px;
    max-height: 480px;
  }
}
</style>
