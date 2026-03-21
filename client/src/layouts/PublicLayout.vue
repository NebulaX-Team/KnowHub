<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NLayout, 
  NLayoutContent, 
  NDrawer, 
  NDrawerContent,
  NLayoutHeader,
  NButton,
  NIcon
} from 'naive-ui'
import { MenuOutline, SunnyOutline, MoonOutline } from '@vicons/ionicons5'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { useRoute } from 'vue-router'
import PublicSidebar from '@/components/layout/PublicSidebar.vue'
import { usePublicStore } from '@/stores/public'
import { storeToRefs } from 'pinia'
import { usePageTitle } from '@/composables/usePageTitle'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const { t } = useI18n()
const publicStore = usePublicStore()
const { tree, currentPageId, currentLibrary } = storeToRefs(publicStore)
const { isDark, toggleTheme } = useTheme()

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')

const mobileSidebarOpen = ref(false)

// Close mobile sidebar on route change
watch(route, () => {
  if (isMobile.value) {
    mobileSidebarOpen.value = false
  }
})

// 使用页面标题composable
usePageTitle()
</script>

<template>
  <div class="public-layout-container">
    <!-- Mobile Header -->
    <n-layout-header v-if="isMobile" bordered class="mobile-header">
      <n-button quaternary circle @click="mobileSidebarOpen = true">
        <template #icon>
          <n-icon><MenuOutline /></n-icon>
        </template>
      </n-button>
      <span class="mobile-title">{{ currentLibrary?.title || t('publicLayout.defaultTitle') }}</span>
      <n-button quaternary circle class="mobile-theme-toggle" @click="toggleTheme">
        <template #icon>
          <n-icon><MoonOutline v-if="!isDark" /><SunnyOutline v-else /></n-icon>
        </template>
      </n-button>
    </n-layout-header>

    <NLayout :has-sider="!isMobile" class="main-layout" :style="{ height: isMobile ? 'calc(100vh - 50px)' : '100vh' }">
      <!-- Desktop Sidebar -->
      <PublicSidebar 
        v-if="!isMobile"
        :tree="tree" 
        :current-id="currentPageId" 
        :library="currentLibrary"
      />

      <!-- Mobile Sidebar (Drawer) -->
      <n-drawer 
        v-if="isMobile" 
        v-model:show="mobileSidebarOpen" 
        placement="left" 
        :width="280"
      >
        <n-drawer-content body-content-style="padding: 0">
           <PublicSidebar 
            :tree="tree" 
            :current-id="currentPageId" 
            :library="currentLibrary"
            is-mobile
          />
        </n-drawer-content>
      </n-drawer>

      <NLayoutContent class="content-area" :content-style="{ padding: isMobile ? '16px' : '24px', minHeight: '100%' }">
        <router-view />
      </NLayoutContent>
    </NLayout>
  </div>
</template>

<style scoped>
.public-layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.mobile-header {
  height: 50px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background-color: var(--color-bg-secondary);
  z-index: 10;
}

.mobile-title {
  margin-left: 12px;
  font-weight: 600;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.mobile-theme-toggle {
  flex-shrink: 0;
}

.main-layout {
  flex: 1;
}

.content-area {
  background-color: var(--color-bg-secondary);
  overflow-y: auto;
}
</style>
