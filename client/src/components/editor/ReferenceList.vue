<script setup lang="ts">
import { ref } from 'vue'
import { NIcon } from 'naive-ui'
import { DocumentTextOutline } from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import NavigableList from './common/NavigableList.vue'

interface PageItem {
  id: string
  title: string
  icon?: string
}

const props = defineProps<{
  items: PageItem[]
  command: (item: { id: string; label: string }) => void
}>()
const { t } = useI18n()

const listRef = ref()

function onKeyDown({ event }: { event: KeyboardEvent }) {
  return listRef.value?.onKeyDown({ event })
}

function handleSelect(item: PageItem) {
  props.command({ id: item.id, label: item.title })
}

defineExpose({
  onKeyDown,
})
</script>

<template>
  <NavigableList ref="listRef" :items="items" @select="handleSelect">
    <template #item="{ item }">
      <span v-if="item.icon" class="icon emoji-icon">{{ item.icon }}</span>
      <n-icon v-else class="icon">
        <DocumentTextOutline />
      </n-icon>
      <span class="label">{{ item.title }}</span>
    </template>
    <template #empty>
      {{ t('editor.referenceList.typeToSearch') }}
    </template>
  </NavigableList>
</template>

<style lang="scss" scoped>
.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  font-size: 1.1rem;
}

.emoji-icon {
  font-style: normal;
  font-size: 1rem;
}

.label {
  flex: 1;
}
</style>
