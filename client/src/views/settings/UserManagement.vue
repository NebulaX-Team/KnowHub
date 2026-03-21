<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NCard,
  NDataTable,
  NButton,
  NSpace,
  NTag,
  NText,
  NPopconfirm,
  useMessage,
  type DataTableColumns,
  type PaginationProps
} from 'naive-ui'
import { useAdminStore, type AdminUser } from '@/stores/admin'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const message = useMessage()
const adminStore = useAdminStore()
const userStore = useUserStore()
const { t, locale } = useI18n()

const title = computed(() => {
  const titleKey = route.meta.titleKey as string | undefined
  if (titleKey) {
    return t(titleKey)
  }
  return (route.meta.title as string) || t('settingsPage.users.defaultTitle')
})
const loading = computed(() => adminStore.loading)
const users = computed(() => adminStore.users)
const pagination = ref<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100]
})

function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ts = value < 1e12 ? value * 1000 : value
    const date = new Date(ts)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return null

    if (/^\d+$/.test(raw)) {
      return parseDateValue(Number(raw))
    }

    const normalized = /^\d{4}-\d{2}-\d{2}\s/.test(raw) ? raw.replace(' ', 'T') : raw
    const date = new Date(normalized)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

function formatDateTime(value: unknown): string {
  const date = parseDateValue(value)
  if (!date) return '-'

  return date.toLocaleString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Columns for the data table
const columns = computed<DataTableColumns<AdminUser>>(() => [
  {
    title: t('settingsPage.users.email'),
    key: 'email',
    minWidth: 200
  },
  {
    title: t('settingsPage.users.displayName'),
    key: 'displayName',
    minWidth: 150,
    render: (row) => row.displayName || '-'
  },
  {
    title: t('settingsPage.users.role'),
    key: 'isAdmin',
    width: 120,
    render: (row) => {
      return h(
        NTag,
        {
          type: row.isAdmin ? 'success' : 'default',
          size: 'small'
        },
        {
          default: () => row.isAdmin ? t('common.status.admin') : t('common.status.user')
        }
      )
    }
  },
  {
    title: t('settingsPage.users.status'),
    key: 'isBanned',
    width: 120,
    render: (row) => {
      return h(
        NTag,
        {
          type: row.isBanned ? 'error' : 'success',
          size: 'small'
        },
        {
          default: () => row.isBanned ? t('common.status.banned') : t('common.status.active')
        }
      )
    }
  },
  {
    title: t('settingsPage.users.createdAt'),
    key: 'createdAt',
    minWidth: 180,
    render: (row) => formatDateTime(row.createdAt)
  },
  {
    title: t('settingsPage.users.actions'),
    key: 'actions',
    width: 200,
    render: (row: AdminUser): ReturnType<typeof h> => {
      if (row.id === userStore.userId) {
        return h(
          NText,
          { depth: 3 },
          { default: () => t('settingsPage.users.currentUserNoActions') }
        )
      }

      const actions: ReturnType<typeof h>[] = []

      actions.push(
        h(
          NButton,
          {
            type: row.isBanned ? 'success' : 'error',
            size: 'small',
            quaternary: true,
            onClick: () => handleToggleBan(row)
          },
          {
            default: () => row.isBanned ? t('settingsPage.users.actionUnban') : t('settingsPage.users.actionBan')
          }
        )
      )

      actions.push(
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleDelete(row),
            negativeText: t('common.actions.cancel'),
            positiveText: t('common.actions.confirm'),
            placement: 'top-end'
          },
          {
            default: () => t('settingsPage.users.deleteConfirm'),
            trigger: (): ReturnType<typeof h> => h(
              NButton,
              {
                type: 'error',
                size: 'small',
                quaternary: true
              },
              {
                default: () => t('common.actions.delete')
              }
            )
          }
        )
      )

      return h(NSpace, { size: 'small' }, { default: () => actions })
    }
  }
])

// Load users
async function loadUsers() {
  const result = await adminStore.fetchUsers({
    page: pagination.value.page || 1,
    pageSize: pagination.value.pageSize || 10
  })

  if (!result.success) {
    message.error(t('settingsPage.users.loadFailed'))
  } else {
    pagination.value.itemCount = adminStore.pagination.total
    pagination.value.pageCount = Math.ceil(adminStore.pagination.total / (pagination.value.pageSize || 10))
  }
}

// Toggle ban status
async function handleToggleBan(user: AdminUser) {
  if (user.id === userStore.userId) {
    message.error(t('settingsPage.users.cannotBanSelf'))
    return
  }

  const result = await adminStore.toggleBan(user.id, !user.isBanned)

  if (result.success) {
    message.success(
      user.isBanned
        ? t('settingsPage.users.userUnbanned')
        : t('settingsPage.users.userBanned')
    )
  } else {
    message.error(result.error || t('settingsPage.users.updateBanFailed'))
  }
}

// Delete user
async function handleDelete(user: AdminUser) {
  if (user.id === userStore.userId) {
    message.error(t('settingsPage.users.cannotDeleteSelf'))
    return
  }

  const result = await adminStore.deleteUser(user.id)

  if (result.success) {
    message.success(t('settingsPage.users.userDeleted'))
  } else {
    message.error(result.error || t('settingsPage.users.deleteFailed'))
  }
}

// Handle page change
function handlePageChange(page: number) {
  pagination.value.page = page
  loadUsers()
}

// Handle page size change
function handlePageSizeChange(size: number) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadUsers()
}

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <div class="settings-content">
    <div class="settings-header">
      <h2>{{ title }}</h2>
    </div>

    <n-card>
      <n-data-table
        :columns="columns"
        :data="users"
        :loading="loading"
        :pagination="pagination"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
        striped
        :remote="true"
      />
    </n-card>
  </div>
</template>

<style scoped lang="scss">
.settings-content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  .settings-header {
    margin-bottom: 24px;
    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
  }
}
</style>
