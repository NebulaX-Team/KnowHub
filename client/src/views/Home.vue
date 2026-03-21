<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, h, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NGrid,
  NGi,
  NCard,
  NButton,
  NIcon,
  NList,
  NListItem,
  NThing,
  NTag,
  NCheckbox,
  NSpace,
  NText,
  NH1,
  NH2,
  NEllipsis,
  NSkeleton,
  NModal,
  NForm,
  NFormItem,
  NInput,
  useMessage,
  NLayout,
  NLayoutContent,
  NLayoutSider,
  NDropdown
} from 'naive-ui'
import {
  AddOutline as AddIcon,
  SearchOutline as SearchIcon,
  TimeOutline as TimeIcon,
  LibraryOutline as LibraryIcon,
  CheckmarkCircleOutline as CheckIcon,
  TrashOutline as TrashIcon,
  EllipsisHorizontal as MoreIcon,
  GridOutline as GridIcon,
  ListOutline as ListIcon,
  AppsOutline as CompactIcon
} from '@vicons/ionicons5'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { useUserStore } from '@/stores/user'
import { useLibraryStore } from '@/stores/library'
import { pageApi } from '@/api/page'

const router = useRouter()
const userStore = useUserStore()
const libraryStore = useLibraryStore()
const message = useMessage()
const { t, locale } = useI18n()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')
const isTablet = breakpoints.smaller('lg')

// View Mode
type ViewMode = 'card' | 'list' | 'compact'
const STORAGE_KEY = 'knowhub_library_view_mode'
const savedViewMode = localStorage.getItem(STORAGE_KEY) as ViewMode | null
const viewMode = ref<ViewMode>((savedViewMode && ['card', 'list', 'compact'].includes(savedViewMode)) ? savedViewMode : 'card')
const setViewMode = (mode: ViewMode) => {
  viewMode.value = mode
  localStorage.setItem(STORAGE_KEY, mode)
}

// Layout State
const rightDrawerCollapsed = ref(false)

// Initial collapsed state check
onMounted(() => {
  if (isTablet.value) {
    rightDrawerCollapsed.value = true
  }
})


// Create Library Modal State
const showCreateLibraryModal = ref(false)
const createLibraryModel = ref({
  title: '',
  description: ''
})
const createLibraryLoading = ref(false)

// Delete Library Modal State
const showDeleteModal = ref(false)
const libraryToDelete = ref<string | null>(null)
const deleteLibraryLoading = ref(false)

// Greeting Logic
const greetingPhrase = ref(t('home.greetings.morning1'))

const updateGreeting = () => {
  const hour = new Date().getHours()
  let timePeriod = ''

  if (hour >= 5 && hour < 12) timePeriod = 'morning'
  else if (hour >= 12 && hour < 18) timePeriod = 'afternoon'
  else if (hour >= 18 && hour < 23) timePeriod = 'evening'
  else timePeriod = 'night'

  const greetings: Record<string, string[]> = {
    morning: [
      t('home.greetings.morning1'),
      t('home.greetings.morning2'),
      t('home.greetings.morning3'),
      t('home.greetings.morning4')
    ],
    afternoon: [
      t('home.greetings.afternoon1'),
      t('home.greetings.afternoon2'),
      t('home.greetings.afternoon3'),
      t('home.greetings.afternoon4')
    ],
    evening: [
      t('home.greetings.evening1'),
      t('home.greetings.evening2'),
      t('home.greetings.evening3'),
      t('home.greetings.evening4')
    ],
    night: [
      t('home.greetings.night1'),
      t('home.greetings.night2'),
      t('home.greetings.night3'),
      t('home.greetings.night4')
    ]
  }

  const options = greetings[timePeriod]
  greetingPhrase.value = options[Math.floor(Math.random() * options.length)]
}

// Date
const currentDate = computed(() => {
  return new Date().toLocaleDateString(locale.value, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Mock Data for Widgets
const recentPages = ref<any[]>([])

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return t('home.timeAgo.justNow')
  if (diffInSeconds < 3600) return t('home.timeAgo.minutesAgo', { count: Math.floor(diffInSeconds / 60) })
  if (diffInSeconds < 86400) return t('home.timeAgo.hoursAgo', { count: Math.floor(diffInSeconds / 3600) })
  if (diffInSeconds < 604800) return t('home.timeAgo.daysAgo', { count: Math.floor(diffInSeconds / 86400) })
  return date.toLocaleDateString(locale.value)
}

const fetchRecentPages = async () => {
  try {
    const res = await pageApi.getPages({
      page: 1,
      pageSize: 5,
      sortBy: 'updatedAt',
      sortDirection: 'DESC'
    })
    if (res.data && res.data.items) {
      recentPages.value = res.data.items.map(page => ({
        id: page.id,
        title: page.title,
        time: formatTimeAgo(page.updatedAt),
        library: page.libraryTitle || t('home.labels.unknownLibrary')
      }))
    }
  } catch (error) {
    console.error('Failed to fetch recent pages', error)
  }
}

const pendingTasks = ref<Array<{ id: string; content: string; page: string; done: boolean }>>([])
const pendingTasksCardRef = ref<HTMLElement | null>(null)
const pendingTasksFocused = ref(false)
let pendingTasksFocusTimer: ReturnType<typeof setTimeout> | null = null

const onThisDay = ref<Array<{ id: string; title: string; icon: string | null; year: string; createdAt: string; libraryTitle: string | null }>>([])

const longUnvisited = ref<Array<{ id: string; title: string; icon: string | null; days: number; lastViewedAt: string | null; libraryTitle: string | null }>>([])

const fetchOnThisDay = async () => {
  try {
    const res = await pageApi.getOnThisDay()
    if (res.data) {
      onThisDay.value = res.data
    }
  } catch (error) {
    console.error('Failed to fetch on-this-day pages', error)
  }
}

const fetchLongUnvisited = async () => {
  try {
    const res = await pageApi.getLongUnvisited()
    if (res.data) {
      longUnvisited.value = res.data
    }
  } catch (error) {
    console.error('Failed to fetch long-unvisited pages', error)
  }
}

// Actions
const handleCreateLibrary = () => {
  createLibraryModel.value = { title: '', description: '' }
  showCreateLibraryModal.value = true
}

const submitCreateLibrary = async () => {
  if (!createLibraryModel.value.title) {
    message.warning(t('home.messages.enterLibraryTitle'))
    return
  }

  createLibraryLoading.value = true
  try {
    const newLib = await libraryStore.createLibrary({
      title: createLibraryModel.value.title,
      content: { type: 'doc', content: [] },
      description: createLibraryModel.value.description
    })

    if (newLib) {
      message.success(t('home.messages.libraryCreated'))
      showCreateLibraryModal.value = false
      libraryStore.setCurrentLibrary(newLib)
      router.push(`/library/${newLib.id}`)
    }
  } catch (error) {
    message.error(t('home.messages.createLibraryFailed'))
  } finally {
    createLibraryLoading.value = false
  }
}

// Library Menu Options
const libraryOptions = computed(() => [
  {
    label: t('common.actions.delete'),
    key: 'delete',
    icon: () => h(NIcon, null, { default: () => h(TrashIcon) })
  }
])

// Context Menu State
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuLibraryId = ref<string | null>(null)

const handleLibraryAction = (key: string, id: string) => {
  if (key === 'delete') {
    libraryToDelete.value = id
    showDeleteModal.value = true
  }
  showContextMenu.value = false
}

const handleContextMenu = (e: MouseEvent, id: string) => {
  e.preventDefault()
  showContextMenu.value = false
  nextTick().then(() => {
    showContextMenu.value = true
    contextMenuX.value = e.clientX
    contextMenuY.value = e.clientY
    contextMenuLibraryId.value = id
  })
}

const onClickoutside = () => {
  showContextMenu.value = false
}

const confirmDeleteLibrary = async () => {
  if (!libraryToDelete.value) return

  deleteLibraryLoading.value = true
  try {
    const success = await libraryStore.deleteLibrary(libraryToDelete.value)
    if (success) {
      message.success(t('home.messages.libraryDeleted'))
      showDeleteModal.value = false
    }
  } catch (error) {
    message.error(t('home.messages.deleteLibraryFailed'))
  } finally {
    deleteLibraryLoading.value = false
    libraryToDelete.value = null
  }
}

const handleSearch = () => {
  // Trigger global search (Ctrl+K)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
}

const handleOpenTasks = async () => {
  if (rightDrawerCollapsed.value) {
    rightDrawerCollapsed.value = false
    await nextTick()
  }
  pendingTasksCardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  pendingTasksFocused.value = true
  if (pendingTasksFocusTimer) {
    clearTimeout(pendingTasksFocusTimer)
  }
  pendingTasksFocusTimer = setTimeout(() => {
    pendingTasksFocused.value = false
  }, 1200)

  if (pendingTasks.value.length === 0) {
    message.info(t('home.empty.noPendingTasks'))
  }
}

const navigateToLibrary = (id: string) => {
  const lib = libraryStore.libraries.find(l => l.id === id)
  if (lib) {
    libraryStore.setCurrentLibrary(lib)
  }
  router.push(`/library/${id}`)
}

const navigateToPage = (id: string) => {
  router.push(`/page/${id}`)
}

onMounted(async () => {
  updateGreeting()
  await Promise.all([
    libraryStore.fetchLibraries(),
    fetchRecentPages(),
    fetchOnThisDay(),
    fetchLongUnvisited()
  ])
})

watch(isTablet, (val: boolean) => {
  if (val) rightDrawerCollapsed.value = true
})

onUnmounted(() => {
  if (pendingTasksFocusTimer) {
    clearTimeout(pendingTasksFocusTimer)
  }
})

watch(locale, () => {
  updateGreeting()
})
</script>

<template>
  <div class="home-view">
    <n-layout has-sider sider-placement="right" style="height: 100%; background: transparent;">
      <n-layout-content :native-scrollbar="false" style="background: transparent;" content-style="padding: 24px;">
        <!-- Header -->
        <div class="header-section">
          <div class="greeting">
            <n-h1 style="margin-bottom: 0;">{{ greetingPhrase }}, {{ userStore.userName }}</n-h1>
            <n-text depth="3">{{ currentDate }}</n-text>
          </div>
        </div>

        <!-- Libraries -->
        <div class="section-header">
          <n-h2>{{ t('home.sections.libraries') }}</n-h2>
          <n-space v-if="libraryStore.libraries.length > 0" :size="4">
            <n-button :type="viewMode === 'card' ? 'primary' : 'default'" quaternary size="small" @click="setViewMode('card')" :title="t('home.view.card')">
              <template #icon><n-icon :size="18"><GridIcon /></n-icon></template>
            </n-button>
            <n-button :type="viewMode === 'compact' ? 'primary' : 'default'" quaternary size="small" @click="setViewMode('compact')" :title="t('home.view.compact')">
              <template #icon><n-icon :size="18"><CompactIcon /></n-icon></template>
            </n-button>
            <n-button :type="viewMode === 'list' ? 'primary' : 'default'" quaternary size="small" @click="setViewMode('list')" :title="t('home.view.list')">
              <template #icon><n-icon :size="18"><ListIcon /></n-icon></template>
            </n-button>
          </n-space>
        </div>

        <div v-if="libraryStore.loading" class="loading-state">
          <n-grid :cols="1" :y-gap="16">
            <n-gi v-for="i in 3" :key="i"><n-skeleton height="100px" width="100%" :sharp="false" /></n-gi>
          </n-grid>
        </div>

        <div v-else-if="libraryStore.libraries.length === 0" class="empty-state">
          <n-card class="empty-card">
            <n-space vertical align="center">
              <n-icon size="48" depth="3"><LibraryIcon /></n-icon>
              <n-text depth="3">{{ t('home.empty.noLibraries') }}</n-text>
              <n-button type="primary" @click="handleCreateLibrary">
                {{ t('home.actions.createFirstLibrary') }}
              </n-button>
            </n-space>
          </n-card>
        </div>

        <!-- Card View -->
        <n-grid v-else-if="viewMode === 'card'" :cols="24" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
          <n-gi span="24 m:12 l:8" v-for="lib in libraryStore.libraries" :key="lib.id">
            <n-card hoverable class="library-card" @click="navigateToLibrary(lib.id)" @contextmenu="(e: MouseEvent) => handleContextMenu(e, lib.id)">
              <template #header>
                <div class="lib-header">
                  <span v-if="lib.icon" style="font-size: 24px; margin-right: 12px; line-height: 1;">{{ lib.icon }}</span>
                  <n-text strong style="font-size: 16px;">{{ lib.title }}</n-text>
                </div>
              </template>
              <template #header-extra>
                <n-space align="center">
                  <n-tag size="small" :bordered="false">
                    {{ t('home.labels.pagesCount', { count: lib.pageCount || 0 }) }}
                  </n-tag>
                  <n-dropdown trigger="click" :options="libraryOptions" @select="(key) => handleLibraryAction(key, lib.id)">
                    <n-button quaternary circle size="small" @click.stop>
                      <template #icon><n-icon><MoreIcon /></n-icon></template>
                    </n-button>
                  </n-dropdown>
                </n-space>
              </template>

              <n-space size="small" style="margin-bottom: 12px;" v-if="lib.tags && lib.tags.length > 0">
                <n-tag v-for="tag in lib.tags" :key="tag.id" size="tiny" :bordered="false" type="info">
                  {{ tag.name }}
                </n-tag>
              </n-space>

              <n-text depth="3" class="lib-desc">
                {{ lib.description || t('home.labels.noDescription') }}
              </n-text>
              <template #footer>
                <n-text depth="3" style="font-size: 12px;">
                  {{ t('home.labels.lastUpdated', { date: new Date(lib.updatedAt || Date.now()).toLocaleDateString(locale) }) }}
                </n-text>
              </template>
            </n-card>
          </n-gi>

          <n-gi span="24 m:12 l:8">
            <n-button dashed block class="new-lib-btn" @click="handleCreateLibrary">
              <template #icon><n-icon><AddIcon /></n-icon></template>
              {{ t('home.actions.createLibrary') }}
            </n-button>
          </n-gi>
        </n-grid>

        <!-- Compact Card View -->
        <n-grid v-else-if="viewMode === 'compact'" :cols="24" :x-gap="12" :y-gap="12" responsive="screen" item-responsive>
          <n-gi span="24 s:12 m:8 l:6" v-for="lib in libraryStore.libraries" :key="lib.id">
            <n-card hoverable class="library-card-compact" size="small" @click="navigateToLibrary(lib.id)" @contextmenu="(e: MouseEvent) => handleContextMenu(e, lib.id)">
              <div class="compact-content">
                <div class="compact-top">
                  <div class="compact-title">
                    <span v-if="lib.icon" class="compact-icon">{{ lib.icon }}</span>
                    <n-text strong>{{ lib.title }}</n-text>
                  </div>
                  <n-dropdown trigger="click" :options="libraryOptions" @select="(key) => handleLibraryAction(key, lib.id)">
                    <n-button quaternary circle size="tiny" @click.stop>
                      <template #icon><n-icon :size="14"><MoreIcon /></n-icon></template>
                    </n-button>
                  </n-dropdown>
                </div>
                <div class="compact-bottom">
                  <n-text depth="3" style="font-size: 12px;">{{ t('home.labels.pagesCount', { count: lib.pageCount || 0 }) }}</n-text>
                  <n-text depth="3" style="font-size: 12px;">{{ new Date(lib.updatedAt || Date.now()).toLocaleDateString(locale) }}</n-text>
                </div>
              </div>
            </n-card>
          </n-gi>

          <n-gi span="24 s:12 m:8 l:6">
            <n-button dashed block class="new-lib-btn-compact" @click="handleCreateLibrary">
              <template #icon><n-icon><AddIcon /></n-icon></template>
              {{ t('home.actions.createLibrary') }}
            </n-button>
          </n-gi>
        </n-grid>

        <!-- List View -->
        <div v-else class="library-list-view">
          <n-card size="small">
            <div
              v-for="lib in libraryStore.libraries"
              :key="lib.id"
              class="library-list-item"
              @click="navigateToLibrary(lib.id)"
              @contextmenu="(e: MouseEvent) => handleContextMenu(e, lib.id)"
            >
              <div class="list-item-left">
                <span v-if="lib.icon" class="list-item-icon">{{ lib.icon }}</span>
                <n-icon v-else :size="20" depth="3"><LibraryIcon /></n-icon>
                <div class="list-item-info">
                  <n-text strong>{{ lib.title }}</n-text>
                  <n-text v-if="lib.description" depth="3" class="list-item-desc">{{ lib.description }}</n-text>
                </div>
              </div>
              <div class="list-item-right">
                <n-space align="center" :size="16">
                  <n-space size="small" v-if="lib.tags && lib.tags.length > 0">
                    <n-tag v-for="tag in lib.tags" :key="tag.id" size="tiny" :bordered="false" type="info">
                      {{ tag.name }}
                    </n-tag>
                  </n-space>
                  <n-tag size="small" :bordered="false">{{ t('home.labels.pagesCount', { count: lib.pageCount || 0 }) }}</n-tag>
                  <n-text depth="3" style="font-size: 12px; white-space: nowrap;">{{ new Date(lib.updatedAt || Date.now()).toLocaleDateString(locale) }}</n-text>
                  <n-dropdown trigger="click" :options="libraryOptions" @select="(key) => handleLibraryAction(key, lib.id)">
                    <n-button quaternary circle size="small" @click.stop>
                      <template #icon><n-icon><MoreIcon /></n-icon></template>
                    </n-button>
                  </n-dropdown>
                </n-space>
              </div>
            </div>
          </n-card>
          <n-button dashed block style="margin-top: 12px;" @click="handleCreateLibrary">
            <template #icon><n-icon><AddIcon /></n-icon></template>
            {{ t('home.actions.createLibrary') }}
          </n-button>
        </div>
      </n-layout-content>

      <!-- Right Drawer -->
      <n-layout-sider
        collapse-mode="transform"
        :collapsed-width="0"
        :width="isMobile ? 280 : 360"
        show-trigger="arrow-circle"
        bordered
        :native-scrollbar="false"
        v-model:collapsed="rightDrawerCollapsed"
        style="background: transparent;"
        class="right-drawer"
      >
        <div class="right-drawer-content">
          <n-space vertical :size="24">

            <!-- Quick Actions -->
            <n-card size="small" :title="t('home.sections.quickActions')">
              <div class="quick-actions-container">
                <div class="action-item" @click="handleCreateLibrary">
                  <n-button secondary circle type="primary" class="action-btn" @click.stop="handleCreateLibrary">
                    <template #icon><n-icon size="20"><AddIcon /></n-icon></template>
                  </n-button>
                  <n-text depth="3" class="action-label">{{ t('home.actions.newLibShort') }}</n-text>
                </div>
                <div class="action-item" @click="handleSearch">
                  <n-button secondary circle type="info" class="action-btn" @click.stop="handleSearch">
                    <template #icon><n-icon size="20"><SearchIcon /></n-icon></template>
                  </n-button>
                  <n-text depth="3" class="action-label">{{ t('home.actions.search') }}</n-text>
                </div>
                <div class="action-item" @click="handleOpenTasks">
                  <n-button secondary circle type="success" class="action-btn" @click.stop="handleOpenTasks">
                    <template #icon><n-icon size="20"><CheckIcon /></n-icon></template>
                  </n-button>
                  <n-text depth="3" class="action-label">{{ t('home.actions.tasks') }}</n-text>
                </div>
              </div>
            </n-card>

            <!-- Recent Pages -->
            <n-card size="small" :title="t('home.sections.recentPages')">
              <n-list hoverable clickable>
                <n-list-item v-for="page in recentPages" :key="page.id" @click="navigateToPage(page.id)">
                  <n-thing>
                    <template #header>
                      <n-ellipsis style="max-width: 200px">{{ page.title }}</n-ellipsis>
                    </template>
                    <template #description>
                      <n-space size="small" align="center">
                        <n-icon size="12" depth="3"><TimeIcon /></n-icon>
                        <n-text depth="3" style="font-size: 12px;">{{ page.time }}</n-text>
                      </n-space>
                    </template>
                  </n-thing>
                </n-list-item>
              </n-list>
            </n-card>

            <!-- Pending Tasks -->
            <div ref="pendingTasksCardRef" :class="{ 'pending-tasks-focus': pendingTasksFocused }">
              <n-card size="small" :title="t('home.sections.pendingTasks')">
                <template #header-extra>
                  <n-tag type="warning" round size="small">{{ pendingTasks.length }}</n-tag>
                </template>
                <n-list v-if="pendingTasks.length > 0">
                  <n-list-item v-for="task in pendingTasks" :key="task.id">
                    <n-space align="start" :wrap="false">
                      <n-checkbox v-model:checked="task.done" />
                      <div>
                        <n-text :delete="task.done">{{ task.content }}</n-text>
                        <br/>
                        <n-text depth="3" style="font-size: 12px;">{{ t('home.labels.fromPage', { page: task.page }) }}</n-text>
                      </div>
                    </n-space>
                  </n-list-item>
                </n-list>
                <n-text v-else depth="3" style="font-size: 13px;">{{ t('home.empty.noPendingTasks') }}</n-text>
              </n-card>
            </div>

            <!-- On This Day -->
            <n-card size="small" :title="t('home.sections.onThisDay')">
              <n-list v-if="onThisDay.length > 0" hoverable clickable>
                <n-list-item v-for="item in onThisDay" :key="item.id" @click="navigateToPage(item.id)">
                  <n-thing>
                    <template #avatar>
                      <n-tag type="info" size="small">{{ item.year }}</n-tag>
                    </template>
                    <template #header>
                      <n-ellipsis style="max-width: 200px">
                        <span v-if="item.icon" style="margin-right: 4px;">{{ item.icon }}</span>{{ item.title }}
                      </n-ellipsis>
                    </template>
                    <template #description v-if="item.libraryTitle">
                      <n-text depth="3" style="font-size: 12px;">{{ item.libraryTitle }}</n-text>
                    </template>
                  </n-thing>
                </n-list-item>
              </n-list>
              <n-text v-else depth="3" style="font-size: 13px;">{{ t('home.empty.noOnThisDay') }}</n-text>
            </n-card>

            <!-- Long Unvisited -->
            <n-card size="small" :title="t('home.sections.longUnvisited')">
              <n-list v-if="longUnvisited.length > 0" hoverable clickable>
                <n-list-item v-for="item in longUnvisited" :key="item.id" @click="navigateToPage(item.id)">
                  <n-space justify="space-between" align="center" style="width: 100%;">
                    <n-ellipsis style="max-width: 180px">
                      <span v-if="item.icon" style="margin-right: 4px;">{{ item.icon }}</span>{{ item.title }}
                    </n-ellipsis>
                    <n-tag type="error" size="small" :bordered="false">{{ t('home.labels.daysAgoShort', { count: item.days }) }}</n-tag>
                  </n-space>
                </n-list-item>
              </n-list>
              <n-text v-else depth="3" style="font-size: 13px;">{{ t('home.empty.noLongUnvisited') }}</n-text>
            </n-card>

          </n-space>
        </div>
      </n-layout-sider>
    </n-layout>

    <!-- Context Menu -->
    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="contextMenuX"
      :y="contextMenuY"
      :options="libraryOptions"
      :show="showContextMenu"
      :on-clickoutside="onClickoutside"
      @select="(key) => contextMenuLibraryId && handleLibraryAction(key, contextMenuLibraryId)"
    />

    <!-- Create Library Modal -->
    <n-modal v-model:show="showCreateLibraryModal">
      <n-card
        style="width: 600px"
        :title="t('home.modal.createLibraryTitle')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <n-form>
          <n-form-item :label="t('home.modal.libraryTitleLabel')">
            <n-input v-model:value="createLibraryModel.title" :placeholder="t('home.modal.libraryTitlePlaceholder')" />
          </n-form-item>
          <n-form-item :label="t('home.modal.descriptionLabel')">
            <n-input
              v-model:value="createLibraryModel.description"
              type="textarea"
              :placeholder="t('home.modal.descriptionPlaceholder')"
            />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showCreateLibraryModal = false">{{ t('common.actions.cancel') }}</n-button>
            <n-button type="primary" :loading="createLibraryLoading" @click="submitCreateLibrary">
              {{ t('common.actions.create') }}
            </n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <!-- Delete Confirmation Modal -->
    <n-modal v-model:show="showDeleteModal">
      <n-card
        style="width: 400px"
        :title="t('home.modal.deleteLibraryTitle')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <p>{{ t('home.modal.deleteLibraryConfirm') }}</p>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showDeleteModal = false">{{ t('common.actions.cancel') }}</n-button>
            <n-button type="error" :loading="deleteLibraryLoading" @click="confirmDeleteLibrary">
              {{ t('common.actions.delete') }}
            </n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.home-view {
  max-width: 1440px;
  margin: 0 auto;
  height: 100%;
}

.header-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.library-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card-hover);
  }

  .lib-header {
    display: flex;
    align-items: flex-start;
  }

  :deep(.n-card-header) {
    align-items: flex-start !important;
  }

  :deep(.n-card-header__main) {
    align-self: flex-start !important;
  }

  :deep(.n-card-header__extra) {
    align-self: flex-start !important;
  }

  .lib-desc {
    display: block;
    margin-top: 8px;
    margin-bottom: 16px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.new-lib-btn {
  height: 100%;
  min-height: 160px;
}

.new-lib-btn-compact {
  height: 100%;
  min-height: 72px;
}

// Compact Card View
.library-card-compact {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }

  .compact-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .compact-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .compact-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
  }

  .compact-icon {
    font-size: 18px;
    line-height: 1;
    flex-shrink: 0;
  }

  .compact-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

// List View
.library-list-view {
  .library-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 8px;
    cursor: pointer;
    border-radius: 6px;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--color-bg-hover);
    }

    & + .library-list-item {
      border-top: 1px solid var(--color-border-light);
    }
  }

  .list-item-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
  }

  .list-item-icon {
    font-size: 20px;
    line-height: 1;
    flex-shrink: 0;
  }

  .list-item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .list-item-desc {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
  }

  .list-item-right {
    flex-shrink: 0;
    margin-left: 16px;
  }
}

.empty-card {
  padding: 40px 0;
  background-color: var(--color-bg-empty);
}

.right-drawer-content {
  padding: 24px;
}

.quick-actions-container {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px;
  border-radius: 8px;

  &:hover {
    background-color: var(--color-bg-hover);

    .action-btn {
      transform: translateY(-2px);
      box-shadow: var(--shadow-card-hover);
    }
  }

  .action-btn {
    width: 48px;
    height: 48px;
    transition: all 0.3s ease;
  }

  .action-label {
    font-size: 12px;
    font-weight: 500;
  }
}

.pending-tasks-focus {
  border-radius: 10px;
  box-shadow: 0 0 0 2px var(--n-primary-color);
  transition: box-shadow 0.2s ease;
}
</style>
