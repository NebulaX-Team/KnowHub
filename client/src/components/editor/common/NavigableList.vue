<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FloatingPanel from './FloatingPanel.vue'

const props = defineProps<{
  items: any[]
}>()

const emit = defineEmits<{
  (e: 'select', item: any): void
}>()

const { t } = useI18n()
const selectedIndex = ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  },
)

function onKeyDown({ event }: { event: KeyboardEvent }) {
  if (event.key === 'ArrowUp') {
    upHandler()
    return true
  }

  if (event.key === 'ArrowDown') {
    downHandler()
    return true
  }

  if (event.key === 'Enter') {
    enterHandler()
    return true
  }

  return false
}

function upHandler() {
  if (props.items.length === 0) return
  selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
}

function downHandler() {
  if (props.items.length === 0) return
  selectedIndex.value = (selectedIndex.value + 1) % props.items.length
}

function enterHandler() {
  selectItem(selectedIndex.value)
}

function selectItem(index: number) {
  const item = props.items[index]
  if (item) {
    emit('select', item)
  }
}

defineExpose({
  onKeyDown,
})
</script>

<template>
  <FloatingPanel class="navigable-list" width="15rem" maxHeight="20rem" padding="0.25rem">
    <button
      v-for="(item, index) in items"
      :key="index"
      class="navigable-item"
      :class="{ 'is-selected': index === selectedIndex }"
      @click="selectItem(index)"
      type="button"
    >
      <slot name="item" :item="item" :selected="index === selectedIndex" :index="index">
         <span>{{ item }}</span>
      </slot>
    </button>
    <div v-if="items.length === 0" class="navigable-item no-result">
      <slot name="empty">{{ t('editor.commandList.noResults') }}</slot>
    </div>
  </FloatingPanel>
</template>

<style lang="scss" scoped>
.navigable-list {
  overflow-y: auto;
}

.navigable-item {
    align-items: center;
    background-color: transparent;
    border: none;
    border-radius: 0.25rem;
    color: var(--color-cmd-text);
    cursor: pointer;
    display: flex;
    font-size: 0.875rem;
    gap: 0.5rem;
    padding: 0.5rem;
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
</style>
