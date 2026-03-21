<script setup lang="ts">
import { ref, watch, nextTick, computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Editor } from '@tiptap/core'
import { NIcon } from 'naive-ui'
import {
  OpenOutline,
  CreateOutline,
  TrashOutline,
  CopyOutline,
  CheckmarkOutline,
  CloseOutline,
} from '@vicons/ionicons5'
import { copyToClipboard } from '@/utils/clipboard'

const props = defineProps<{
  editor: Editor
}>()
const { t } = useI18n()

const visible = ref(false)
const editing = ref(false)
const position = ref({ top: 0, left: 0 })

const linkUrl = ref('')
const linkText = ref('')
const originalUrl = ref('')
const originalText = ref('')

// ref placed on the teleported popover element itself
const popoverRef = ref<HTMLElement | null>(null)
const urlInputRef = ref<HTMLInputElement | null>(null)

// Store the source link element so we can recalculate position on scroll
let sourceLinkEl: HTMLElement | null = null

const hasTextChange = computed(() => linkText.value !== originalText.value)
const hasUrlChange = computed(() => linkUrl.value !== originalUrl.value)

function updatePosition() {
  if (!sourceLinkEl) return
  const rect = sourceLinkEl.getBoundingClientRect()
  position.value = {
    top: rect.bottom + 4,
    left: rect.left,
  }
}

function show(url: string, text: string, linkEl: HTMLElement, autoEdit = false) {
  linkUrl.value = url
  linkText.value = text
  originalUrl.value = url
  originalText.value = text
  editing.value = autoEdit
  sourceLinkEl = linkEl

  updatePosition()
  visible.value = true

  if (autoEdit) {
    nextTick(() => {
      urlInputRef.value?.focus()
    })
  }
}

function hide() {
  visible.value = false
  editing.value = false
  sourceLinkEl = null
}

function startEdit() {
  editing.value = true
  nextTick(() => {
    urlInputRef.value?.focus()
  })
}

function cancelEdit() {
  if (!originalUrl.value) {
    removeLink()
    return
  }
  linkUrl.value = originalUrl.value
  linkText.value = originalText.value
  editing.value = false
}

function saveEdit() {
  const { editor } = props
  if (!editor) return

  const url = linkUrl.value.trim()
  if (!url) {
    removeLink()
    return
  }

  if (hasTextChange.value) {
    const newText = linkText.value.trim() || url
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .insertContent({
        type: 'text',
        text: newText,
        marks: [{ type: 'link', attrs: { href: url } }],
      })
      .run()
  } else if (hasUrlChange.value) {
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run()
  }

  editing.value = false
  hide()
}

function openLink() {
  if (linkUrl.value) {
    window.open(linkUrl.value, '_blank', 'noopener,noreferrer')
  }
}

function copyLink() {
  if (linkUrl.value) {
    copyToClipboard(linkUrl.value)
  }
}

function removeLink() {
  const { editor } = props
  if (!editor) return
  editor.chain().focus().extendMarkRange('link').unsetLink().run()
  hide()
}

// Close on click outside — check the popoverRef (the teleported element)
function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (popoverRef.value && !popoverRef.value.contains(target)) {
    hide()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (editing.value) {
      cancelEdit()
    } else {
      hide()
    }
  }
}

function handleScroll() {
  if (visible.value) {
    updatePosition()
  }
}

watch(visible, (val) => {
  if (val) {
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeydown)
    }, 100)
    window.addEventListener('scroll', handleScroll, true)
  } else {
    document.removeEventListener('mousedown', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('scroll', handleScroll, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('scroll', handleScroll, true)
})

defineExpose({ show, hide, visible })
</script>

<template>
  <!-- No wrapper div needed; popover is teleported to body -->
  <Teleport to="body">
      <Transition name="link-popover">
        <div
          v-if="visible"
          ref="popoverRef"
          class="link-popover"
          :style="{
            position: 'fixed',
            top: position.top + 'px',
            left: position.left + 'px',
            zIndex: 1000,
          }"
        >
          <!-- View Mode -->
          <div v-if="!editing" class="link-view">
            <div class="link-info">
              <span class="link-url" :title="linkUrl">{{ linkUrl }}</span>
            </div>
            <div class="link-actions">
              <button class="link-action-btn" @click="openLink" :title="t('editor.linkMenu.openLink')">
                <n-icon :size="16"><OpenOutline /></n-icon>
              </button>
              <button class="link-action-btn" @click="copyLink" :title="t('editor.linkMenu.copyLink')">
                <n-icon :size="16"><CopyOutline /></n-icon>
              </button>
              <button class="link-action-btn" @click="startEdit" :title="t('editor.linkMenu.editLink')">
                <n-icon :size="16"><CreateOutline /></n-icon>
              </button>
              <button class="link-action-btn danger" @click="removeLink" :title="t('editor.linkMenu.removeLink')">
                <n-icon :size="16"><TrashOutline /></n-icon>
              </button>
            </div>
          </div>

          <!-- Edit Mode -->
          <div v-else class="link-edit">
            <div class="link-edit-row">
              <label class="link-edit-label">{{ t('editor.linkMenu.urlLabel') }}</label>
              <input
                ref="urlInputRef"
                v-model="linkUrl"
                class="link-edit-input"
                :placeholder="t('editor.linkMenu.urlPlaceholder')"
                @keydown.enter.prevent="saveEdit"
              />
            </div>
            <div class="link-edit-row">
              <label class="link-edit-label">{{ t('editor.linkMenu.textLabel') }}</label>
              <input
                v-model="linkText"
                class="link-edit-input"
                :placeholder="t('editor.linkMenu.textPlaceholder')"
                @keydown.enter.prevent="saveEdit"
              />
            </div>
            <div class="link-edit-actions">
              <button class="link-btn cancel" @click="cancelEdit">
                <n-icon :size="14"><CloseOutline /></n-icon>
                {{ t('editor.linkMenu.cancel') }}
              </button>
              <button class="link-btn save" @click="saveEdit" :disabled="!linkUrl.trim()">
                <n-icon :size="14"><CheckmarkOutline /></n-icon>
                {{ t('editor.linkMenu.save') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
</template>

<style lang="scss" scoped>
.link-popover {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-popup);
  min-width: 300px;
  max-width: 420px;
  overflow: hidden;
}

.link-view {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;

  .link-info {
    flex: 1;
    min-width: 0;
    
    .link-url {
      font-size: 13px;
      color: var(--color-link-url);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
      max-width: 240px;
    }
  }

  .link-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }
}

.link-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--color-cmd-btn-text);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background-color: var(--color-cmd-btn-hover-bg);
    color: var(--color-cmd-btn-hover-text);
  }

  &.danger:hover {
    background-color: var(--color-link-danger-bg);
    color: var(--color-link-danger-text);
  }
}

.link-edit {
  padding: 12px;

  .link-edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .link-edit-label {
      font-size: 12px;
      color: var(--color-link-edit-label);
      width: 32px;
      flex-shrink: 0;
      text-align: right;
    }

    .link-edit-input {
      flex: 1;
      height: 32px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 13px;
      color: var(--color-link-edit-text);
      outline: none;
      transition: border-color 0.15s;
      background: transparent;

      &:focus {
        border-color: var(--color-text-link);
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
      }

      &::placeholder {
        color: var(--color-link-edit-placeholder);
      }
    }
  }

  .link-edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 12px;
  }
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &.cancel {
    background: var(--color-link-btn-cancel-bg);
    color: var(--color-link-btn-cancel-text);

    &:hover {
      background: var(--color-link-btn-cancel-hover-bg);
      color: var(--color-link-btn-cancel-hover-text);
    }
  }

  &.save {
    background: var(--color-link-btn-save-bg);
    color: #fff;

    &:hover {
      background: var(--color-link-btn-save-hover);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// Transition
.link-popover-enter-active {
  transition: opacity 0.15s, transform 0.15s;
}
.link-popover-leave-active {
  transition: opacity 0.1s, transform 0.1s;
}
.link-popover-enter-from,
.link-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
