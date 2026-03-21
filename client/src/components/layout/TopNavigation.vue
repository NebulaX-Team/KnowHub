<script setup lang="ts">
import { ref, h, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { 
  NLayoutHeader, 
  NInput, 
  NIcon, 
  NAvatar, 
  NDropdown, 
  NButton,
  NModal,
  NCard,
  NList,
  NListItem,
  NTag,
  NSpace,
  NText,
  NA
} from 'naive-ui'
import { 
  SearchOutline as SearchIcon,
  MenuOutline as MenuIcon,
  HelpCircleOutline as HelpIcon,
  SettingsOutline as SettingsIcon,
  LogOutOutline as LogOutIcon,
  PersonOutline as PersonIcon,
  SunnyOutline as SunnyIcon,
  MoonOutline as MoonIcon
} from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import { useSystemStore } from '@/stores/system'
import { useTheme } from '@/composables/useTheme'
import { useLocale } from '@/composables/useLocale'

const props = defineProps<{
  collapsed: boolean
  isMobile?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:collapsed', value: boolean): void
}>()

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const systemStore = useSystemStore()
const { isDark, toggleTheme } = useTheme()
const { t } = useI18n()
const { locale, setLocale } = useLocale()

const showSearch = ref(false)
const searchText = ref('')
const showHelp = ref(false)

const openHelp = () => {
  showHelp.value = true
}

// User Menu Options (computed based on admin status)
const userOptions = computed(() => {
  const options = [
    {
      label: t('topNav.profileSettings'),
      key: 'profile',
      icon: () => h(NIcon, null, { default: () => h(PersonIcon) })
    },
    {
      label: t('topNav.yourContent'),
      key: 'content',
      icon: () => h(NIcon, null, { default: () => h(MenuIcon) })
    }
  ]

  // Only show Settings option for admin users
  if (userStore.isAdmin) {
    options.push({
      label: t('topNav.settings'),
      key: 'settings',
      icon: () => h(NIcon, null, { default: () => h(SettingsIcon) })
    })
  }

  options.push(
    {
      type: 'divider',
      key: 'd1'
    } as any,
    {
      label: t('topNav.logout'),
      key: 'logout',
      icon: () => h(NIcon, null, { default: () => h(LogOutIcon) })
    }
  )

  return options
})

const languageOptions = computed(() => [
  { label: t('locale.zhCN'), key: 'zh-CN' },
  { label: t('locale.enUS'), key: 'en-US' },
])

const currentLocaleShort = computed(() => (locale.value === 'zh-CN' ? '中' : 'EN'))

const handleLanguageSelect = (key: string) => {
  if (key === 'zh-CN' || key === 'en-US') {
    setLocale(key)
  }
}

const handleUserSelect = (key: string) => {
  if (key === 'logout') {
    userStore.logout()
    router.push('/login')
  } else if (key === 'settings') {
    router.push('/settings/site-info')
  } else if (key === 'profile') {
    router.push('/settings/profile')
  } else if (key === 'content') {
    router.push('/settings/libraries')
  }
}

const toggleSidebar = () => {
  emit('update:collapsed', !props.collapsed)
}

const openSearch = () => {
  showSearch.value = true
}

// Keyboard shortcut for search
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    openSearch()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadRecentSearches()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Avatar error handling
const avatarSrc = computed(() => {
  const url = userStore.user?.avatar
  if (!url || url.trim() === '') return undefined
  return url
})

const RECENT_SEARCHES_KEY = 'knowhub_recent_searches'
const recentSearches = ref<string[]>([])

const loadRecentSearches = () => {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) {
      recentSearches.value = []
      return
    }
    const parsed = JSON.parse(raw)
    recentSearches.value = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    recentSearches.value = []
  }
}

const saveRecentSearches = (items: string[]) => {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items))
}

const addRecentSearch = (value: string) => {
  const query = value.trim()
  if (!query) return
  const next = [query, ...recentSearches.value.filter((item) => item !== query)].slice(0, 8)
  recentSearches.value = next
  saveRecentSearches(next)
}

const handleSearchSubmit = () => {
  addRecentSearch(searchText.value)
}

const handleRecentSearchClick = (value: string) => {
  searchText.value = value
}

const searchResults = computed(() => {
  const query = searchText.value.trim().toLowerCase()
  if (!query) return []
  return recentSearches.value
    .filter((item) => item.toLowerCase().includes(query))
    .map((item) => ({
      title: item,
      path: t('topNav.searchHistoryPath'),
    }))
})

const showSidebarToggle = computed(() => {
  if (route.name === 'Home') return false
  if (props.isMobile) return true
  return route.path.startsWith('/settings')
})
</script>

<template>
  <n-layout-header bordered class="nav-header">
    <div class="nav-left">
      <n-button
        quaternary
        circle
        class="sidebar-toggle"
        @click="toggleSidebar"
        v-if="showSidebarToggle"
      >
        <template #icon>
          <n-icon :component="MenuIcon" />
        </template>
      </n-button>
      <div class="logo" @click="router.push('/')">{{ systemStore.siteTitle }}</div>
    </div>

    <div class="nav-center">
      <div class="search-trigger" @click="openSearch" :class="{ 'mobile-search': isMobile }">
        <n-icon :component="SearchIcon" class="search-icon" />
        <span class="search-placeholder" v-if="!isMobile">{{ t('topNav.searchPlaceholder') }}</span>
        <span class="search-shortcut" v-if="!isMobile">Ctrl+K</span>
      </div>
    </div>

    <div class="nav-right">
      <n-dropdown :options="languageOptions" @select="handleLanguageSelect">
        <n-button quaternary class="lang-btn" :title="t('locale.switchLanguage')">
          {{ currentLocaleShort }}
        </n-button>
      </n-dropdown>
      <n-button quaternary circle class="icon-btn" @click="toggleTheme" :title="isDark ? t('topNav.switchToLight') : t('topNav.switchToDark')">
        <template #icon>
          <n-icon :component="isDark ? SunnyIcon : MoonIcon" />
        </template>
      </n-button>
      <n-button quaternary circle class="icon-btn" @click="openHelp">
        <template #icon>
          <n-icon :component="HelpIcon" />
        </template>
      </n-button>

      <n-dropdown :options="userOptions" @select="handleUserSelect">
        <div class="user-profile">
          <n-avatar
            v-if="avatarSrc"
            round
            size="small"
            :src="avatarSrc"
          />
          <n-avatar
            v-else
            round
            size="small"
            :style="{ backgroundColor: isDark ? '#0A84FF' : '#1A73E8' }"
          >
            {{ userStore.userName?.[0]?.toUpperCase() || 'U' }}
          </n-avatar>
        </div>
      </n-dropdown>
    </div>

    <!-- Search Modal -->
    <n-modal v-model:show="showSearch">
      <n-card
        style="width: 600px; max-width: 90vw;"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
        class="search-modal"
      >
        <template #header>
          <n-input
            v-model:value="searchText"
            :placeholder="t('topNav.searchInputPlaceholder')"
            size="large"
            clearable
            autofocus
            @keydown.enter="handleSearchSubmit"
          >
            <template #prefix>
              <n-icon :component="SearchIcon" />
            </template>
          </n-input>
        </template>

        <div class="search-content">
          <div v-if="!searchText" class="recent-searches">
            <n-text depth="3" class="section-title">{{ t('topNav.recentSearches') }}</n-text>
            <n-list v-if="recentSearches.length > 0" hoverable clickable>
              <n-list-item v-for="item in recentSearches" :key="item" @click="handleRecentSearchClick(item)">
                <n-space align="center">
                  <n-icon :component="SearchIcon" depth="3" />
                  {{ item }}
                </n-space>
              </n-list-item>
            </n-list>
            <n-text v-else depth="3">{{ t('topNav.noRecentSearches') }}</n-text>
            
            <div class="filters" style="margin-top: 20px;">
               <n-space>
                 <n-tag checkable>{{ t('topNav.filterLibrary') }}</n-tag>
                 <n-tag checkable>{{ t('topNav.filterTags') }}</n-tag>
                 <n-tag checkable>{{ t('topNav.filterTime') }}</n-tag>
               </n-space>
            </div>
          </div>

          <div v-else class="search-results">
            <n-text depth="3" class="section-title">{{ t('topNav.searchResults') }}</n-text>
            <n-list v-if="searchResults.length > 0" hoverable clickable>
              <n-list-item v-for="res in searchResults" :key="res.title">
                <div class="result-item">
                  <div class="result-title">{{ res.title }}</div>
                  <div class="result-path">{{ res.path }}</div>
                </div>
              </n-list-item>
            </n-list>
            <n-text v-else depth="3">{{ t('topNav.noSearchResults') }}</n-text>
          </div>
        </div>
      </n-card>
    </n-modal>

    <!-- Help Modal -->
    <n-modal v-model:show="showHelp">
      <n-card
        style="width: 600px; max-width: 90vw;"
        :title="t('topNav.aboutTitle')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <n-space vertical size="large">
          <div>
            <n-text strong style="font-size: 18px;">{{ t('common.appName') }}</n-text>
            <p>{{ t('topNav.aboutDescription') }}</p>
          </div>

          <div>
            <n-text strong>{{ t('topNav.version') }}</n-text>
            <p>v1.0.0</p>
          </div>

          <div>
            <n-text strong>{{ t('topNav.resources') }}</n-text>
            <n-list :bordered="false" class="about-resource-list">
              <n-list-item>
                <div class="about-resource-row">
                  <n-a href="https://github.com/NebulaX-Team/KnowHub" target="_blank" rel="noreferrer noopener">
                    {{ t('topNav.github') }}
                  </n-a>
                  <n-text depth="3" class="about-resource-host">github.com</n-text>
                </div>
              </n-list-item>
              <n-list-item>
                <div class="about-resource-row">
                  <n-a href="https://github.com/NebulaX-Team/KnowHub#readme" target="_blank" rel="noreferrer noopener">
                    {{ t('topNav.docs') }}
                  </n-a>
                  <n-text depth="3" class="about-resource-host">README</n-text>
                </div>
              </n-list-item>
            </n-list>
          </div>

          <div>
            <n-text strong>{{ t('topNav.shortcuts') }}</n-text>
            <n-list>
              <n-list-item>
                <n-space justify="space-between">
                  <span>{{ t('topNav.globalSearch') }}</span>
                  <n-tag size="small">Ctrl + K</n-tag>
                </n-space>
              </n-list-item>
            </n-list>
          </div>
        </n-space>
      </n-card>
    </n-modal>
  </n-layout-header>
</template>

<style scoped lang="scss">
.nav-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  box-sizing: border-box;
  z-index: 100;
  background-color: var(--color-bg-secondary);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
  
  .logo {
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    color: var(--color-text-link);
    user-select: none;
  }
}

.nav-center {
  flex: 1;
  max-width: 600px;
  margin: 0 20px;
  
  .search-trigger {
    background-color: var(--color-bg-input);
    border-radius: 8px;
    height: 36px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    cursor: text;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: var(--color-bg-input-hover);
    }
    
    .search-icon {
      color: var(--color-text-icon);
      margin-right: 8px;
      font-size: 16px;
    }
    
    .search-placeholder {
      flex: 1;
      color: var(--color-text-icon);
      font-size: 14px;
    }
    
    .search-shortcut {
      color: var(--color-text-placeholder);
      font-size: 12px;
      background: var(--color-bg-kbd);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--color-border-input);
    }
  }
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
  justify-content: flex-end;

  .lang-btn {
    min-width: 44px;
    font-weight: 600;
  }
  
  .user-profile {
    cursor: pointer;
    display: flex;
    align-items: center;
    margin-left: 8px;
    
    &:hover {
      opacity: 0.8;
    }
  }
}

.section-title {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.result-item {
  .result-title {
    font-weight: 500;
    color: var(--color-text-link);
  }
  .result-path {
    font-size: 12px;
    color: var(--color-text-icon);
  }
}

.about-resource-list {
  margin-top: 8px;
}

.about-resource-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.about-resource-host {
  font-size: 12px;
  white-space: nowrap;
}
</style>
