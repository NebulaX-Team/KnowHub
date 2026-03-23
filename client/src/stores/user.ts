import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginRequest, type RegisterRequest, type SendVerificationRequest, type VerifyCodeRequest, type RegisterWithCodeRequest, type SendResetPasswordRequest, type ResetPasswordRequest } from '@/api/auth'
import { userApi, type UpdateProfileRequest } from '@/api/user'
import { STORAGE_TOKEN_KEY } from '@/constants'
import { i18n } from '@/i18n'

export interface User {
  id: string
  email: string
  displayName?: string
  avatar?: string
  isAdmin: boolean
  isProfilePublic?: boolean
  isBanned?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuthResult {
  success: boolean
  data?: any
  error?: string
}

export const useUserStore = defineStore('user', () => {
  const tr = (key: string) => i18n.global.t(key) as string

  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem(STORAGE_TOKEN_KEY))
  const loading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const userName = computed(() => user.value?.displayName || user.value?.email || '')
  const userId = computed(() => user.value?.id || '')
  const isAdmin = computed(() => user.value?.isAdmin || false)

  // Actions
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem(STORAGE_TOKEN_KEY, newToken)
  }

  const clearToken = () => {
    token.value = null
    localStorage.removeItem(STORAGE_TOKEN_KEY)
  }

  const setUser = (newUser: User) => {
    user.value = newUser
  }

  const clearUser = () => {
    user.value = null
  }

  const login = async (credentials: LoginRequest): Promise<AuthResult> => {
    loading.value = true
    try {
      const response = await authApi.login(credentials)
      
      if (response.code === 0) {
        setToken(response.data.access_token)
        setUser(response.data.user)
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.auth.loginFailed') }
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || tr('errors.auth.loginNetwork')
      }
    } finally {
      loading.value = false
    }
  }

  const register = async (data: RegisterRequest): Promise<AuthResult> => {
    loading.value = true
    try {
      const response = await authApi.register(data)

      if (response.code === 0) {
        setToken(response.data.access_token)
        setUser(response.data.user)
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.auth.registerFailed') }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || tr('errors.auth.registerNetwork')
      }
    } finally {
      loading.value = false
    }
  }

  const sendVerification = async (data: SendVerificationRequest): Promise<AuthResult> => {
    loading.value = true
    try {
      const response = await authApi.sendVerification(data)

      if (response.code === 0) {
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.auth.sendVerificationFailed') }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || tr('errors.auth.sendVerificationNetwork')
      }
    } finally {
      loading.value = false
    }
  }

  const verifyCode = async (data: VerifyCodeRequest): Promise<AuthResult> => {
    loading.value = true
    try {
      const response = await authApi.verifyCode(data)

      if (response.code === 0) {
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.auth.verifyCodeFailed') }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || tr('errors.auth.verifyCodeNetwork')
      }
    } finally {
      loading.value = false
    }
  }

  const registerWithCode = async (data: RegisterWithCodeRequest): Promise<AuthResult> => {
    loading.value = true
    try {
      const response = await authApi.registerWithCode(data)

      if (response.code === 0) {
        setToken(response.data.access_token)
        setUser(response.data.user)
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.auth.registerFailed') }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || tr('errors.auth.registerNetwork')
      }
    } finally {
      loading.value = false
    }
  }

  const fetchProfile = async (): Promise<AuthResult> => {
    if (!token.value) {
      return { success: false }
    }

    loading.value = true
    try {
      const response = await authApi.getProfile()
      
      if (response.code === 0) {
        setUser(response.data)
        return { success: true, data: response.data }
      } else {
        clearToken()
        return { success: false }
      }
    } catch (error) {
      clearToken()
      return { success: false, error: tr('errors.profile.fetchFailed') }
    } finally {
      loading.value = false
    }
  }

  const updateProfile = async (data: UpdateProfileRequest): Promise<AuthResult> => {
    loading.value = true
    try {
      const response = await userApi.updateProfile(data)
      
      if (response.code === 0) {
        setUser(response.data)
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.profile.updateFailed') }
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || tr('errors.profile.updateFailed')
      }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    clearToken()
    clearUser()
  }

  const sendResetPassword = async (data: SendResetPasswordRequest): Promise<AuthResult> => {
    loading.value = true
    try {
      const response = await authApi.sendResetPassword(data)

      if (response.code === 0) {
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.auth.sendResetFailed') }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || tr('errors.auth.sendResetNetwork')
      }
    } finally {
      loading.value = false
    }
  }

  const resetPassword = async (data: ResetPasswordRequest): Promise<AuthResult> => {
    loading.value = true
    try {
      const response = await authApi.resetPassword(data)

      if (response.code === 0) {
        return { success: true, data: response.data }
      } else {
        return { success: false, error: tr('errors.auth.resetPasswordFailed') }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || tr('errors.auth.resetPasswordNetwork')
      }
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    user,
    token,
    loading,

    // Getters
    isAuthenticated,
    userName,
    userId,
    isAdmin,

    // Actions
    login,
    register,
    sendVerification,
    verifyCode,
    registerWithCode,
    sendResetPassword,
    resetPassword,
    fetchProfile,
    updateProfile,
    logout
  }
})
