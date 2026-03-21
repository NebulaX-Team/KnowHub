import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { systemApi, type SiteInfo, type UpdateSiteInfoDto } from '@/api/system'
import { i18n, type AppLocale } from '@/i18n'

export interface SystemConfig {
  title: string
  description: string
  titleI18n: {
    'zh-CN': string
    'en-US': string
  }
  descriptionI18n: {
    'zh-CN': string
    'en-US': string
  }
  updatedAt: string
}

const DEFAULT_TITLE_I18N: Record<AppLocale, string> = {
  'zh-CN': '知枢',
  'en-US': 'KnowHub',
}

const DEFAULT_DESCRIPTION_I18N: Record<AppLocale, string> = {
  'zh-CN': '面向个人的结构化知识管理系统',
  'en-US': 'Personal Knowledge Management System',
}

function normalizeLocalizedText(
  value: unknown,
  fallback: Record<AppLocale, string>
): { 'zh-CN': string; 'en-US': string } {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const zh = typeof obj['zh-CN'] === 'string' ? obj['zh-CN'] : undefined
    const en = typeof obj['en-US'] === 'string' ? obj['en-US'] : undefined
    if (zh || en) {
      return {
        'zh-CN': (zh || fallback['zh-CN']).trim(),
        'en-US': (en || fallback['en-US']).trim(),
      }
    }
  }

  if (typeof value === 'string' && value.trim()) {
    const legacy = value.trim()
    return { 'zh-CN': legacy, 'en-US': legacy }
  }

  return { 'zh-CN': fallback['zh-CN'], 'en-US': fallback['en-US'] }
}

function normalizeConfig(raw: Partial<SiteInfo> | undefined): SystemConfig {
  const titleI18n = normalizeLocalizedText(raw?.titleI18n ?? raw?.title, DEFAULT_TITLE_I18N)
  const descriptionI18n = normalizeLocalizedText(raw?.descriptionI18n ?? raw?.description, DEFAULT_DESCRIPTION_I18N)
  const locale = i18n.global.locale.value as AppLocale

  return {
    title: raw?.title?.trim() || titleI18n[locale] || DEFAULT_TITLE_I18N[locale],
    description: raw?.description?.trim() || descriptionI18n[locale] || DEFAULT_DESCRIPTION_I18N[locale],
    titleI18n,
    descriptionI18n,
    updatedAt: raw?.updatedAt || new Date().toISOString(),
  }
}

export const useSystemStore = defineStore('system', () => {
  // State
  const config = ref<SystemConfig>(normalizeConfig(undefined))
  
  const loading = ref(false)
  const initialized = ref(false)
  const currentLocale = computed(() => i18n.global.locale.value as AppLocale)

  // Getters
  const siteTitle = computed(() => {
    return config.value.titleI18n[currentLocale.value] || config.value.title
  })
  const siteDescription = computed(() => {
    return config.value.descriptionI18n[currentLocale.value] || config.value.description
  })
  const siteUpdatedAt = computed(() => config.value.updatedAt)

  // Actions
  async function fetchConfig() {
    if (initialized.value) return // 已初始化，无需重复获取
    
    loading.value = true
    try {
      const response = await systemApi.getSiteInfo()
      config.value = normalizeConfig(response.data)
      initialized.value = true
    } catch (error) {
      console.error('Failed to fetch system config:', error)
      // 保持默认值
    } finally {
      loading.value = false
    }
  }

  async function updateConfig(newConfig: UpdateSiteInfoDto) {
    loading.value = true
    try {
      const response = await systemApi.updateSiteInfo(newConfig)
      config.value = normalizeConfig(response.data)
      return config.value
    } catch (error) {
      console.error('Failed to update system config:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Auto-fetch on store creation (once)
  if (!initialized.value) {
    fetchConfig()
  }

  return {
    // State
    config,
    loading,
    initialized,
    
    // Getters
    siteTitle,
    siteDescription,
    siteUpdatedAt,
    
    // Actions
    fetchConfig,
    updateConfig
  }
})
