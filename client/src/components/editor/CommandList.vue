<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import FloatingPanel from './common/FloatingPanel.vue'

interface CommandItem {
  title: string
  description?: string
  icon?: Component
  group?: string
  children?: CommandItem[]
  command?: (params: { editor: any; range: any }) => void
}

const props = defineProps<{
  items: CommandItem[]
  command: (item: CommandItem) => void
  query?: string
}>()

const { t } = useI18n()
const selectedIndex = ref(0)
const menuStack = ref<CommandItem[]>([])

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
    menuStack.value = []
  },
)

const visibleItems = computed(() => {
  const current = menuStack.value[menuStack.value.length - 1]
  return current?.children || props.items
})

watch(visibleItems, (items) => {
  if (items.length === 0) {
    selectedIndex.value = 0
    return
  }
  if (selectedIndex.value >= items.length) {
    selectedIndex.value = items.length - 1
  }
})

const grouped = computed(() => {
  const groups: { label: string; items: { item: CommandItem; flatIndex: number }[] }[] = []
  const map = new Map<string, { item: CommandItem; flatIndex: number }[]>()
  const order: string[] = []

  visibleItems.value.forEach((item, i) => {
    const key = item.group || ''
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key)!.push({ item, flatIndex: i })
  })

  for (const key of order) {
    groups.push({ label: key, items: map.get(key)! })
  }
  return groups
})

const hasSubmenu = computed(() => menuStack.value.length > 0)
const currentSubmenuTitle = computed(() => menuStack.value[menuStack.value.length - 1]?.title || '')

function enterItem(item: CommandItem) {
  if (item.children?.length) {
    menuStack.value.push(item)
    selectedIndex.value = 0
    return
  }
  if (item.command) {
    props.command(item)
  }
}

function backToParent() {
  if (!menuStack.value.length) return false
  menuStack.value.pop()
  selectedIndex.value = 0
  return true
}

function onKeyDown({ event }: { event: KeyboardEvent }) {
  const count = visibleItems.value.length

  if (event.key === 'ArrowUp') {
    if (!count) return true
    selectedIndex.value = (selectedIndex.value + count - 1) % count
    return true
  }

  if (event.key === 'ArrowDown') {
    if (!count) return true
    selectedIndex.value = (selectedIndex.value + 1) % count
    return true
  }

  if (event.key === 'ArrowRight') {
    const item = visibleItems.value[selectedIndex.value]
    if (item?.children?.length) {
      enterItem(item)
      return true
    }
  }

  if (event.key === 'ArrowLeft') {
    if (backToParent()) {
      return true
    }
  }

  if (event.key === 'Backspace' && !props.query && hasSubmenu.value) {
    if (backToParent()) {
      return true
    }
  }

  if (event.key === 'Tab') {
    const item = visibleItems.value[selectedIndex.value]
    if (item?.children?.length) {
      enterItem(item)
      return true
    }
  }

  if (event.key === 'Enter') {
    const item = visibleItems.value[selectedIndex.value]
    if (item) enterItem(item)
    return true
  }

  return false
}

defineExpose({ onKeyDown })
</script>

<template>
  <FloatingPanel class="command-list" width="17rem" maxHeight="22rem" padding="0.25rem">
    <button
      v-if="hasSubmenu"
      type="button"
      class="submenu-back"
      @click="backToParent"
    >
      <span class="back-arrow">←</span>
      <span class="back-label">{{ t('editor.commandList.back') }}</span>
      <span class="back-title">{{ currentSubmenuTitle }}</span>
    </button>

    <template v-for="group in grouped" :key="group.label">
      <div v-if="group.label" class="group-label">{{ group.label }}</div>
      <button
        v-for="entry in group.items"
        :key="entry.flatIndex"
        type="button"
        class="command-item"
        :class="{
          'is-selected': entry.flatIndex === selectedIndex,
          'has-children': !!entry.item.children?.length,
        }"
        @click="enterItem(entry.item)"
      >
        <n-icon v-if="entry.item.icon" class="icon" :component="entry.item.icon" />
        <div class="text">
          <span class="label">{{ entry.item.title }}</span>
          <span v-if="entry.item.description" class="desc">{{ entry.item.description }}</span>
        </div>
        <span v-if="entry.item.children?.length" class="submenu-arrow">›</span>
      </button>
    </template>
    <div v-if="visibleItems.length === 0" class="command-item no-result">{{ t('editor.commandList.noResults') }}</div>
  </FloatingPanel>
</template>

<style lang="scss" scoped>
.command-list {
  overflow-y: auto;
}

.submenu-back {
  width: 100%;
  border: none;
  border-radius: 0.4rem;
  background: rgba(255, 255, 255, 0.02);
  color: var(--color-cmd-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.38rem 0.5rem;
  margin-bottom: 0.3rem;
  text-align: left;

  &:hover {
    background-color: var(--color-cmd-bg-hover);
    color: var(--color-cmd-text-hover);
  }
}

.back-arrow {
  font-size: 0.9rem;
  color: var(--color-cmd-icon);
}

.back-label {
  font-size: 0.75rem;
  color: var(--color-cmd-desc);
}

.back-title {
  min-width: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-cmd-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-cmd-desc);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.4rem 0.5rem 0.15rem;
  user-select: none;

  &:not(:first-child) {
    margin-top: 0.25rem;
    border-top: 1px solid var(--color-cmd-border);
    padding-top: 0.5rem;
  }
}

.command-item {
  align-items: center;
  background-color: transparent;
  border: none;
  border-radius: 0.25rem;
  color: var(--color-cmd-text);
  cursor: pointer;
  display: flex;
  font-size: 0.875rem;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  text-align: left;
  width: 100%;

  &.is-selected,
  &:hover {
    background-color: var(--color-cmd-bg-hover);
    color: var(--color-cmd-text-hover);
  }

  &.has-children {
    padding-right: 0.4rem;
  }

  &.no-result {
    color: var(--color-cmd-icon);
    cursor: default;
    &:hover {
      background-color: transparent;
    }
  }
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  font-size: 1.1rem;
  color: var(--color-cmd-icon);
}

.text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.label {
  line-height: 1.3;
}

.desc {
  font-size: 0.75rem;
  color: var(--color-cmd-desc);
  line-height: 1.2;
}

.submenu-arrow {
  color: var(--color-cmd-icon);
  font-size: 0.95rem;
  line-height: 1;
  flex-shrink: 0;
}
</style>
