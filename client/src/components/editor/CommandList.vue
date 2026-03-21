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
  command: (editor: any, range: any) => void
}

const props = defineProps<{
  items: CommandItem[]
  command: (item: CommandItem) => void
}>()

const { t } = useI18n()
const selectedIndex = ref(0)

watch(
  () => props.items,
  () => { selectedIndex.value = 0 },
)

const grouped = computed(() => {
  const groups: { label: string; items: { item: CommandItem; flatIndex: number }[] }[] = []
  const map = new Map<string, { item: CommandItem; flatIndex: number }[]>()
  const order: string[] = []

  props.items.forEach((item, i) => {
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

function onKeyDown({ event }: { event: KeyboardEvent }) {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    return true
  }
  if (event.key === 'Enter') {
    const item = props.items[selectedIndex.value]
    if (item) props.command(item)
    return true
  }
  return false
}

defineExpose({ onKeyDown })
</script>

<template>
  <FloatingPanel class="command-list" width="16rem" maxHeight="22rem" padding="0.25rem">
    <template v-for="group in grouped" :key="group.label">
      <div v-if="group.label" class="group-label">{{ group.label }}</div>
      <button
        v-for="entry in group.items"
        :key="entry.flatIndex"
        type="button"
        class="command-item"
        :class="{ 'is-selected': entry.flatIndex === selectedIndex }"
        @click="command(entry.item)"
      >
        <n-icon v-if="entry.item.icon" class="icon" :component="entry.item.icon" />
        <div class="text">
          <span class="label">{{ entry.item.title }}</span>
          <span v-if="entry.item.description" class="desc">{{ entry.item.description }}</span>
        </div>
      </button>
    </template>
    <div v-if="items.length === 0" class="command-item no-result">{{ t('editor.commandList.noResults') }}</div>
  </FloatingPanel>
</template>

<style lang="scss" scoped>
.command-list {
  overflow-y: auto;
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
}

.label {
  line-height: 1.3;
}

.desc {
  font-size: 0.75rem;
  color: var(--color-cmd-desc);
  line-height: 1.2;
}
</style>
