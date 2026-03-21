<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NPopover,
  NIcon,
  NTabs,
  NTabPane,
  NScrollbar,
  NInput,
  NButton,
  useMessage
} from 'naive-ui'
import {
  AddOutline,
  SearchOutline,
  TrashOutline
} from '@vicons/ionicons5'
import emojiData from '@emoji-mart/data'
import type { EmojiMartData, Category } from '@emoji-mart/data'

const props = defineProps<{
  value?: string
}>()

const emit = defineEmits<{
  (e: 'update:value', value: string | undefined | null): void
}>()

const message = useMessage()
const { t } = useI18n()
const showPopover = ref(false)
const searchQuery = ref('')

// Extract emoji categories from emoji-mart data
const emojiCategories = computed(() => {
  const categories: Array<{
    name: string
    emojis: Array<{ emoji: string; name: string; keywords: string[] }>
  }> = []

  const data = emojiData as EmojiMartData
  if (!data || !data.categories) {
    return categories
  }

  // Map emoji-mart categories to our format
  const categoryMap: Record<string, string> = {
    smileys: t('iconPicker.categories.smileys'),
    people: t('iconPicker.categories.people'),
    nature: t('iconPicker.categories.nature'),
    food: t('iconPicker.categories.food'),
    activities: t('iconPicker.categories.activities'),
    travel: t('iconPicker.categories.travel'),
    objects: t('iconPicker.categories.objects'),
    symbols: t('iconPicker.categories.symbols'),
    flags: t('iconPicker.categories.flags')
  }

  data.categories.forEach((category: Category) => {
    const categoryName = categoryMap[category.id] || category.id
    const emojis = category.emojis.map((emojiId: string) => {
      const emoji = data.emojis[emojiId]
      if (!emoji) return null
      return {
        emoji: emoji.skins[0].native,
        name: emoji.name,
        keywords: emoji.keywords || []
      }
    }).filter(Boolean)

    if (emojis.length > 0) {
      categories.push({
        name: categoryName,
        emojis: emojis as Array<{ emoji: string; name: string; keywords: string[] }>
      })
    }
  })

  return categories
})

// Filter emojis based on search query
const filteredCategories = computed(() => {
  if (!searchQuery.value.trim()) {
    return emojiCategories.value
  }

  const query = searchQuery.value.toLowerCase()
  return emojiCategories.value.map(category => ({
    ...category,
    emojis: category.emojis.filter(emoji =>
      emoji.name.toLowerCase().includes(query) ||
      emoji.keywords.some(keyword => keyword.toLowerCase().includes(query))
    )
  })).filter(category => category.emojis.length > 0)
})

// Handle emoji selection
const handleSelect = (emoji: string) => {
  emit('update:value', emoji)
  showPopover.value = false
  searchQuery.value = ''
}

// Handle clear (remove icon)
const handleClear = () => {
  emit('update:value', null)
  searchQuery.value = ''
  message.success(t('iconPicker.messages.cleared'))
}

// Handle manual input
const handleInput = (val: string | null) => {
  if (!val) {
    emit('update:value', undefined)
    return
  }

  // Match any extended pictographic character (emojis)
  const match = val.match(/\p{Extended_Pictographic}/u)
  if (match) {
    emit('update:value', match[0])
    showPopover.value = false
    searchQuery.value = ''
  } else {
    // If no emoji found, show a warning
    message.warning(t('iconPicker.messages.invalid'))
  }
}

// Handle search input
const handleSearch = (val: string) => {
  searchQuery.value = val
}

// Get emoji preview for the current value
const emojiPreview = computed(() => {
  if (!props.value) return null

  // Try to find the emoji in our data
  for (const category of emojiCategories.value) {
    const found = category.emojis.find(e => e.emoji === props.value)
    if (found) {
      return {
        emoji: found.emoji,
        name: found.name
      }
    }
  }

  // If not found in data, just show the emoji
  return {
    emoji: props.value,
    name: t('iconPicker.customEmoji')
  }
})
</script>

<template>
  <n-popover
    trigger="click"
    placement="bottom-start"
    v-model:show="showPopover"
    class="emoji-picker-popover"
    :show-arrow="false"
    :width="380"
    :style="{ maxWidth: '400px' }"
  >
    <template #trigger>
      <div class="icon-trigger" :class="{ 'has-icon': !!value }">
        <span v-if="value" class="emoji-icon">{{ value }}</span>
        <div v-else class="placeholder-icon">
          <n-icon><AddOutline /></n-icon>
        </div>
      </div>
    </template>

    <div class="emoji-picker">
      <!-- Header with search and clear -->
      <div class="picker-header">
        <div class="search-section">
          <n-input
            v-model:value="searchQuery"
            :placeholder="t('iconPicker.placeholders.search')"
            size="small"
            clearable
            @update:value="handleSearch"
          >
            <template #prefix>
              <n-icon :component="SearchOutline" />
            </template>
          </n-input>
        </div>

        <div class="action-buttons">
          <n-button
            v-if="value"
            size="tiny"
            quaternary
            type="error"
            @click="handleClear"
            :title="t('iconPicker.actions.clear')"
          >
            <template #icon>
              <n-icon><TrashOutline /></n-icon>
            </template>
          </n-button>
        </div>
      </div>

      <!-- Manual input section -->
      <div class="manual-input-section">
        <n-input
          :value="value"
          :placeholder="t('iconPicker.placeholders.manualInput')"
          size="small"
          clearable
          @update:value="handleInput"
          @clear="handleClear"
        >
          <template #prefix>
            <n-icon :component="AddOutline" />
          </template>
        </n-input>
      </div>

      <!-- Emoji preview -->
      <div v-if="emojiPreview" class="emoji-preview">
        <div class="preview-emoji">{{ emojiPreview.emoji }}</div>
        <div class="preview-name">{{ emojiPreview.name }}</div>
      </div>

      <!-- Emoji grid tabs -->
      <n-tabs type="line" size="small" animated>
        <n-tab-pane
          v-for="category in filteredCategories"
          :key="category.name"
          :name="category.name"
          :tab="category.name"
        >
          <n-scrollbar>
            <div class="emoji-grid">
              <button
                v-for="emojiItem in category.emojis"
                :key="emojiItem.emoji"
                class="emoji-btn"
                @click="handleSelect(emojiItem.emoji)"
                :title="emojiItem.name"
              >
                {{ emojiItem.emoji }}
              </button>
            </div>
          </n-scrollbar>
        </n-tab-pane>
      </n-tabs>

      <!-- Empty state -->
      <div v-if="filteredCategories.length === 0" class="empty-state">
        <p>{{ t('iconPicker.empty') }}</p>
      </div>
    </div>
  </n-popover>
</template>

<style scoped lang="scss">
.icon-trigger {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  margin-right: 12px;
  border: 1px solid transparent;
  flex-shrink: 0;

  &:hover {
    background-color: var(--color-bg-hover);
    border-color: var(--color-border-light);
  }

  .emoji-icon {
    font-size: 22px;
    line-height: 1;
  }

  .placeholder-icon {
    width: 32px;
    height: 32px;
    border: 1px dashed var(--color-picker-border);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-picker-placeholder);

    &:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
  }
}

.emoji-picker {
  width: 100%;
  max-width: 380px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  max-height: 70vh;

  .picker-header {
    padding: 10px 12px;
    border-bottom: 1px solid var(--color-picker-separator);
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    flex-shrink: 0;

    .search-section {
      flex: 1;
      min-width: 140px;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
  }

  .manual-input-section {
    padding: 10px 12px;
    border-bottom: 1px solid var(--color-picker-separator);
    flex-shrink: 0;
  }

  .emoji-preview {
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--color-picker-preview-bg);
    border-radius: 6px;
    margin: 8px 12px;
    min-height: 48px;
    flex-shrink: 0;

    .preview-emoji {
      font-size: 28px;
      line-height: 1;
      flex-shrink: 0;
    }

    .preview-name {
      font-size: 12px;
      color: var(--color-picker-preview-text);
      flex: 1;
      word-break: break-word;
    }
  }

  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
    gap: 4px;
    padding: 8px 12px;
    overflow: hidden;

    .emoji-btn {
      border: none;
      background: none;
      font-size: 18px;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif;
      transition: all 0.15s;
      overflow: hidden;
      min-width: 0;

      &:hover {
        background-color: var(--color-picker-hover);
        transform: scale(1.1);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }

  .empty-state {
    padding: 24px;
    text-align: center;
    color: var(--color-picker-empty);
    font-size: 14px;
    flex-shrink: 0;
  }
}

// Override naive-ui popover styles
:deep(.emoji-picker-popover) {
  padding: 0 !important;
  max-width: 400px;
  max-height: 75vh;
  overflow: hidden;
}

// Ensure scrollbar doesn't cause overflow and fits within container
:deep(.n-scrollbar) {
  max-height: 240px !important;
  overflow: hidden;
}

// Ensure tabs content fits properly
:deep(.n-tabs-pane-wrapper) {
  overflow: hidden;
}

// Responsive adjustments
@media (max-width: 480px) {
  .emoji-picker {
    min-width: 260px;
    max-width: 90vw;

    .picker-header {
      padding: 8px 10px;
    }

    .manual-input-section {
      padding: 8px 10px;
    }

    .emoji-preview {
      margin: 6px 10px;
      padding: 10px;
    }

    .emoji-grid {
      padding: 6px 10px;
      gap: 3px;

      .emoji-btn {
        width: 32px;
        height: 32px;
        font-size: 16px;
        padding: 4px;
      }
    }
  }

  :deep(.emoji-picker-popover) {
    max-width: 92vw;
  }
}

// Ensure no horizontal scroll and proper box sizing
.emoji-picker,
.emoji-grid,
.picker-header,
.manual-input-section {
  box-sizing: border-box;
}

// Fix for very small screens
@media (max-width: 320px) {
  .emoji-picker {
    min-width: 240px;

    .picker-header {
      padding: 6px 8px;
      gap: 4px;
    }

    .manual-input-section {
      padding: 6px 8px;
    }

    .emoji-preview {
      margin: 4px 8px;
      padding: 8px;
      gap: 8px;

      .preview-emoji {
        font-size: 24px;
      }
    }

    .emoji-grid {
      padding: 4px 8px;
      gap: 2px;

      .emoji-btn {
        width: 28px;
        height: 28px;
        font-size: 14px;
        padding: 3px;
      }
    }
  }
}

// Ensure proper focus styles for accessibility
.icon-trigger:focus-visible,
.emoji-btn:focus-visible {
  outline: 2px solid var(--primary-color, #18a058);
  outline-offset: 2px;
}

// Prevent emoji button overflow in edge cases
.emoji-btn {
  min-width: 0;
  max-width: 100%;
  text-overflow: ellipsis;
}
</style>
