<script setup lang="ts">
import { h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NLayoutSider, NTree, NText, NIcon, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
import { BookOutline, SunnyOutline, MoonOutline } from '@vicons/ionicons5'
import { useSystemStore } from '@/stores/system'
import { useTheme } from '@/composables/useTheme'
import type { Page as RawPage, Library } from '@/types'
import type { TreeOption } from 'naive-ui'

const systemStore = useSystemStore()
const { isDark, toggleTheme } = useTheme()
const { t } = useI18n()

const props = defineProps<{
  tree: Array<RawPage & { children?: RawPage[] }>
  currentId?: string
  library?: Library | null
  isMobile?: boolean
}>()

type Page = RawPage & { children?: Page[] }

const componentType = computed(() => (props.isMobile ? 'div' : NLayoutSider))

const bindProps = computed(() => {
  if (props.isMobile) {
    return {
      class: ['public-sidebar', 'mobile-sidebar', 'is-mobile'],
    }
  }

  return {
    bordered: true,
    width: 292,
    'native-scrollbar': true,
    class: 'public-sidebar',
    'show-trigger': false,
  }
})

const router = useRouter()

const mapToTreeOptions = (nodes: Page[]): TreeOption[] => nodes.map((node) => ({
  key: node.id,
  id: node.id,
  title: node.title,
  icon: node.icon,
  publicSlug: node.publicSlug,
  children: node.children && node.children.length > 0 ? mapToTreeOptions(node.children) : undefined,
}))

const processedTree = computed<TreeOption[]>(() => mapToTreeOptions(props.tree as Page[]))

const countPages = (nodes: Page[]): number => nodes.reduce((total, node) => {
  const childrenCount = node.children ? countPages(node.children) : 0
  return total + 1 + childrenCount
}, 0)

const pageCount = computed(() => countPages(props.tree as Page[]))
const pageCountLabel = computed(() => t('publicSidebar.total', { count: pageCount.value }))

function handleSelect(keys: Array<string | number>) {
  if (!keys.length) return

  const findNode = (nodes: Page[], key: string): Page | undefined => {
    for (const node of nodes) {
      if (node.id === key) return node
      if (node.children) {
        const found = findNode(node.children, key)
        if (found) return found
      }
    }
    return undefined
  }

  const node = findNode(props.tree as Page[], keys[0] as string)
  if (!node) return

  const slug = node.publicSlug || node.id
  router.push(`/public/pages/${slug}`)
}

function goToLibrary() {
  if (!props.library) return
  const slug = props.library.publicSlug || props.library.id
  router.push(`/public/libraries/${slug}`)
}

const renderLabel = ({ option }: { option: TreeOption }) =>
  h(NText, { depth: 1, style: 'font-size: 13px;' }, { default: () => option.title as string })

const renderPrefix = ({ option }: { option: TreeOption }) => {
  const page = option as unknown as Page
  if (page.icon) {
    return h('span', { class: 'page-icon' }, page.icon)
  }
  return ''
}
</script>

<template>
  <component :is="componentType" v-bind="bindProps">
    <div class="sidebar-shell">
      <button
        type="button"
        class="library-card"
        :class="{ clickable: !!library }"
        :title="t('publicSidebar.openLibrary')"
        @click="goToLibrary"
      >
        <span class="library-avatar">
          <span v-if="library?.icon" class="emoji-icon">{{ library.icon }}</span>
          <NIcon v-else :size="20"><BookOutline /></NIcon>
        </span>
        <span class="library-info">
          <strong class="library-name">{{ library?.title || t('publicLayout.defaultTitle') }}</strong>
          <small class="library-meta">{{ pageCountLabel }}</small>
        </span>
      </button>

      <section class="sidebar-main">
        <div class="section-header">
          <span class="section-title">{{ t('publicSidebar.pages') }}</span>
          <span class="section-count">{{ pageCountLabel }}</span>
        </div>

        <div class="tree-container">
          <NTree
            block-line
            :data="processedTree"
            key-field="id"
            label-field="title"
            children-field="children"
            :selected-keys="currentId ? [currentId] : []"
            @update:selected-keys="handleSelect"
            :render-label="renderLabel"
            :render-prefix="renderPrefix"
            default-expand-all
            class="custom-tree"
          />

          <div v-if="processedTree.length === 0" class="tree-empty">
            {{ t('publicSidebar.empty') }}
          </div>
        </div>
      </section>

      <footer class="sidebar-footer">
        <NButton quaternary circle size="small" class="theme-button" @click="toggleTheme">
          <template #icon>
            <NIcon :size="16"><MoonOutline v-if="!isDark" /><SunnyOutline v-else /></NIcon>
          </template>
        </NButton>

        <div class="footer-text">
          <NText depth="3" class="footer-title">{{ systemStore.siteTitle }}</NText>
          <NText depth="3" class="footer-meta-text">
            {{ t('publicSidebar.poweredBy') }}
            <a href="https://github.com/NebulaX-Team/KnowHub" target="_blank" rel="noopener noreferrer">
              {{ t('common.appName') }}
            </a>
          </NText>
        </div>
      </footer>
    </div>
  </component>
</template>

<style scoped lang="scss">
.public-sidebar {
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: var(--color-bg-sidebar);
}

.public-sidebar :deep(.n-layout-sider-scroll-container),
.public-sidebar :deep(.n-layout-sider-children) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-shell {
  height: 100%;
  box-sizing: border-box;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 10px 72px;
}

.library-card {
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-align: left;
  transition: background-color 0.2s ease;

  &.clickable {
    cursor: pointer;
  }

  &:hover {
    background: var(--color-bg-hover);
  }
}

.library-avatar {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--color-bg-hover);
}

.emoji-icon {
  font-size: 16px;
  line-height: 1;
}

.library-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.library-name {
  font-size: 18px;
  line-height: 1.2;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.library-meta {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.sidebar-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: none;
  border-radius: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 8px 6px;
  border-bottom: none;
}

.section-title {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 600;
  color: var(--color-text-tertiary);
}

.section-count {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.tree-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 2px 6px;
}

.tree-empty {
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.sidebar-footer {
  border-top: none;
  padding: 8px 4px 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 8px;
}

.theme-button {
  flex-shrink: 0;
}

.footer-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.footer-title {
  font-size: 11px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.footer-meta-text {
  font-size: 11px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  a {
    color: var(--n-primary-color);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

:deep(.n-tree) {
  .n-tree-node {
    border-radius: 6px;
    margin-bottom: 1px;
    padding: 4px 3px;

    &:hover {
      background: var(--color-bg-hover);
    }

    &.n-tree-node--selected {
      background: color-mix(in srgb, var(--n-primary-color) 14%, transparent);

      .n-tree-node-content__text {
        color: var(--n-primary-color);
        font-weight: 600;
      }
    }
  }
}

.page-icon {
  font-size: 16px;
  margin-right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

@media (max-width: 1023px) {
  .public-sidebar.is-mobile {
    height: 100%;
  }

  .sidebar-shell {
    padding: 10px 10px 72px;
  }

  .library-name {
    font-size: 17px;
  }
}
</style>
