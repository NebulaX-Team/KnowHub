import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userApi, type UserListQuery, type UserListResponse, type UserData } from '@/api/user'
import { i18n } from '@/i18n'

export interface AdminUser extends UserData {}

export interface AdminResult {
  success: boolean
  data?: any
  error?: string
}

export const useAdminStore = defineStore('admin', () => {
  const tr = (key: string) => i18n.global.t(key) as string

  // State
  const users = ref<AdminUser[]>([])
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: false
  })

  // Actions
  const fetchUsers = async (query: UserListQuery = {}): Promise<AdminResult> => {
    loading.value = true
    try {
      const response: UserListResponse = await userApi.getUsers(query)

      if (response.code === 0) {
        users.value = response.data.items
        pagination.value = {
          page: response.data.page,
          pageSize: response.data.pageSize,
          total: response.data.total,
          hasMore: response.data.hasMore
        }
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.admin.fetchUsersFailed') }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || tr('errors.admin.fetchUsersFailed')
      }
    } finally {
      loading.value = false
    }
  }

  const toggleBan = async (userId: string, isBanned: boolean): Promise<AdminResult> => {
    loading.value = true
    try {
      const response = await userApi.toggleBan(userId, isBanned)

      if (response.code === 0) {
        // Update local state
        const index = users.value.findIndex(u => u.id === userId)
        if (index !== -1) {
          users.value[index] = { ...users.value[index], isBanned }
        }
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.admin.updateBanFailed') }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || tr('errors.admin.updateBanFailed')
      }
    } finally {
      loading.value = false
    }
  }

  const deleteUser = async (userId: string): Promise<AdminResult> => {
    loading.value = true
    try {
      const response = await userApi.deleteUser(userId)

      if (response.code === 0) {
        // Remove from local state
        users.value = users.value.filter(u => u.id !== userId)
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.admin.deleteUserFailed') }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || tr('errors.admin.deleteUserFailed')
      }
    } finally {
      loading.value = false
    }
  }

  const clearUsers = () => {
    users.value = []
    pagination.value = {
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: false
    }
  }

  return {
    // State
    users,
    loading,
    pagination,

    // Actions
    fetchUsers,
    toggleBan,
    deleteUser,
    clearUsers
  }
})
