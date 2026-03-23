<script setup lang="ts">
import { h, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NMenu,
  NIcon,
  type MenuOption
} from 'naive-ui'
import {
  PersonOutline,
  LockClosedOutline,
  LibraryOutline,
  DocumentTextOutline,
  FolderOutline,
  PeopleCircleOutline,
  ArchiveOutline,
  ImagesOutline,
  CopyOutline,
  InformationCircleOutline,
  MailOutline,
  ShieldCheckmarkOutline,
  PersonCircleOutline,
} from '@vicons/ionicons5'
import TopNavigation from '@/components/layout/TopNavigation.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()

// 使用 usePageTitle 来管理页面标题
usePageTitle()

// Get admin status from user store
const isAdmin = computed(() => userStore.isAdmin)
const collapsed = ref(false)

function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = [
    {
      label: t('settings.groupPersonal'),
      key: 'personal',
      type: 'group',
      children: [
        {
          label: t('settings.profile'),
          key: 'profile',
          icon: renderIcon(PersonOutline)
        },
        {
          label: t('settings.security'),
          key: 'security',
          icon: renderIcon(LockClosedOutline)
        }
      ]
    },
    {
      label: t('settings.groupDocuments'),
      key: 'documents',
      type: 'group',
      children: [
        {
          label: t('settings.libraries'),
          key: 'libraries',
          icon: renderIcon(LibraryOutline)
        },
        {
          label: t('settings.pages'),
          key: 'pages',
          icon: renderIcon(DocumentTextOutline)
        },
        {
          label: t('settings.groups'),
          key: 'groups',
          icon: renderIcon(FolderOutline)
        },
        {
          label: t('settings.teams'),
          key: 'teams',
          icon: renderIcon(PeopleCircleOutline)
        },
        {
          label: t('settings.archived'),
          key: 'archived',
          icon: renderIcon(ArchiveOutline)
        },
        {
          label: t('settings.assets'),
          key: 'assets',
          icon: renderIcon(ImagesOutline)
        },
        {
          label: t('settings.templates'),
          key: 'templates',
          icon: renderIcon(CopyOutline)
        }
      ]
    }
  ]

  if (isAdmin.value) {
    options.push({
      label: t('settings.groupSystem'),
      key: 'system',
      type: 'group',
      children: [
        {
          label: t('settings.siteInfo'),
          key: 'site-info',
          icon: renderIcon(InformationCircleOutline)
        },
        {
          label: t('settings.smtp'),
          key: 'smtp',
          icon: renderIcon(MailOutline)
        },
        {
          label: t('settings.access'),
          key: 'access',
          icon: renderIcon(ShieldCheckmarkOutline)
        },
        {
          label: t('settings.users'),
          key: 'users',
          icon: renderIcon(PersonCircleOutline)
        }
      ]
    })
  }

  return options
})

// Current selected key mapping
const activeKey = computed(() => {
  const path = route.path
  const parts = path.split('/')
  return parts[parts.length - 1]
})

function handleUpdateValue(key: string) {
  router.push(`/settings/${key}`)
}
</script>

<template>
  <n-layout class="settings-layout-wrapper">
    <TopNavigation v-model:collapsed="collapsed" />
    <n-layout has-sider class="settings-layout">
      <n-layout-sider
        bordered
        :width="240"
        :collapsed="collapsed"
        collapse-mode="width"
        :native-scrollbar="false"
        class="settings-sider"
      >
        <div class="settings-title" v-if="!collapsed">{{ t('settings.title') }}</div>
        <n-menu
          :collapsed="collapsed"
          :collapsed-width="64"
          :collapsed-icon-size="22"
          :options="menuOptions"
          :value="activeKey"
          @update:value="handleUpdateValue"
          default-expand-all
        />
      </n-layout-sider>
      <n-layout-content class="settings-content-wrapper">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped lang="scss">
.settings-layout-wrapper {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.settings-layout {
  flex: 1;
  height: calc(100vh - 56px);
}

.settings-sider {
  padding-top: 12px;
}

.settings-title {
  padding: 0 24px;
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  white-space: nowrap;
}

.settings-content-wrapper {
  background-color: var(--n-color);
}
</style>
