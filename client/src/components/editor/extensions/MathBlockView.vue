<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import katex from 'katex'

const props = defineProps<{
  node: { attrs: { latex: string } }
  updateAttributes: (attrs: any) => void
  editor: any
  selected: boolean
}>()

const editing = ref(false)
const latexInput = ref(props.node.attrs.latex || '')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const errorMsg = ref('')
const { t } = useI18n()

const renderedHtml = computed(() => {
  const tex = props.node.attrs.latex
  if (!tex) return ''
  try {
    errorMsg.value = ''
    return katex.renderToString(tex, {
      displayMode: true,
      throwOnError: false,
      output: 'htmlAndMathml',
    })
  } catch (e: any) {
    errorMsg.value = e.message || t('editor.math.invalidLatex')
    return ''
  }
})

const previewHtml = computed(() => {
  if (!latexInput.value) return ''
  try {
    return katex.renderToString(latexInput.value, {
      displayMode: true,
      throwOnError: false,
      output: 'htmlAndMathml',
    })
  } catch {
    return `<span class="math-error">${t('editor.math.invalidLatex')}</span>`
  }
})

function startEdit() {
  if (!props.editor.isEditable) return
  editing.value = true
  latexInput.value = props.node.attrs.latex || ''
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

function finishEdit() {
  props.updateAttributes({ latex: latexInput.value })
  editing.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    finishEdit()
  }
  // Shift+Enter for newline, Enter alone to confirm
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    finishEdit()
  }
}

// Auto-resize textarea
function autoResize() {
  const el = textareaRef.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }
}

watch(latexInput, () => {
  nextTick(autoResize)
})

onMounted(() => {
  // If empty, start in edit mode
  if (!props.node.attrs.latex) {
    startEdit()
  }
})
</script>

<template>
  <node-view-wrapper class="math-block-wrapper" :class="{ 'is-selected': selected }">
    <!-- Display Mode -->
    <div v-if="!editing" class="math-block-display" @click="startEdit">
      <div
        v-if="renderedHtml"
        class="math-block-rendered"
        v-html="renderedHtml"
      />
      <div v-else class="math-block-placeholder">
        {{ t('editor.math.block.clickToAdd') }}
      </div>
    </div>

    <!-- Edit Mode -->
    <div v-else class="math-block-editor">
      <div class="math-block-editor-header">
        <span class="math-block-label">{{ t('editor.math.block.label') }}</span>
        <span class="math-block-hint">{{ t('editor.math.block.hint') }}</span>
      </div>
      <textarea
        ref="textareaRef"
        v-model="latexInput"
        class="math-block-textarea"
        :placeholder="t('editor.math.block.placeholder')"
        spellcheck="false"
        @keydown="handleKeydown"
        @blur="finishEdit"
        rows="2"
      />
      <!-- Live preview -->
      <div class="math-block-preview">
        <div
          v-if="latexInput"
          class="math-block-preview-content"
          v-html="previewHtml"
        />
        <div v-else class="math-block-preview-empty">{{ t('editor.math.block.previewEmpty') }}</div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<style lang="scss" scoped>
.math-block-wrapper {
  margin: 1em 0;

  &.is-selected .math-block-display {
    outline: 2px solid var(--color-math-border);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

.math-block-display {
  padding: 16px 20px;
  border-radius: 6px;
  background: var(--color-math-bg);
  border: 1px solid var(--color-border);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, box-shadow 0.15s;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--color-math-placeholder);
    box-shadow: var(--shadow-card);
  }
}

.math-block-rendered {
  overflow: hidden;
  :deep(.katex-display) {
    margin: 0;
    padding: 2px 0;
    overflow: hidden;

    > .katex {
      overflow: hidden;
    }
  }
}

.math-block-placeholder {
  color: var(--color-math-placeholder);
  font-style: italic;
  font-size: 14px;
}

.math-block-editor {
  border: 1px solid var(--color-math-border);
  border-radius: 6px;
  background: var(--color-math-bg);
  overflow: hidden;
}

.math-block-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--color-math-header-bg);
  border-bottom: 1px solid var(--color-math-header-border);
}

.math-block-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-math-label);
}

.math-block-hint {
  font-size: 11px;
  color: var(--color-math-hint);
}

.math-block-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 10px 12px;
  background: transparent;
  color: var(--color-math-text);
  box-sizing: border-box;
}

.math-block-preview {
  padding: 12px 16px;
  border-top: 1px dashed var(--color-border);
  text-align: center;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.math-block-preview-content {
  overflow: hidden;

  :deep(.katex-display) {
    margin: 0;
    padding: 2px 0;
    overflow: hidden;

    > .katex {
      overflow: hidden;
    }
  }
}

.math-block-preview-empty {
  color: var(--color-math-preview-empty);
  font-size: 13px;
  font-style: italic;
}

:deep(.math-error) {
  color: #ef4444;
  font-size: 12px;
}
</style>
