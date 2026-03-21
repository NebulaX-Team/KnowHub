<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { ref, computed, nextTick, onMounted } from 'vue'
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
const inputRef = ref<HTMLInputElement | null>(null)
const { t } = useI18n()

const renderedHtml = computed(() => {
  const tex = props.node.attrs.latex
  if (!tex) return ''
  try {
    return katex.renderToString(tex, {
      displayMode: false,
      throwOnError: false,
      output: 'htmlAndMathml',
    })
  } catch {
    return `<span class="math-error">${tex}</span>`
  }
})

function startEdit() {
  if (!props.editor.isEditable) return
  editing.value = true
  latexInput.value = props.node.attrs.latex || ''
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function finishEdit() {
  props.updateAttributes({ latex: latexInput.value })
  editing.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Enter') {
    e.preventDefault()
    finishEdit()
  }
}

onMounted(() => {
  if (!props.node.attrs.latex) {
    startEdit()
  }
})
</script>

<template>
  <node-view-wrapper class="math-inline-wrapper" as="span">
    <!-- Display Mode -->
    <span
      v-if="!editing"
      class="math-inline-display"
      :class="{ 'is-selected': selected }"
      @click="startEdit"
    >
      <span v-if="renderedHtml" v-html="renderedHtml" />
      <span v-else class="math-inline-placeholder">{{ t('editor.math.inline.emptySample') }}</span>
    </span>

    <!-- Edit Mode -->
    <span v-else class="math-inline-edit">
      <input
        ref="inputRef"
        v-model="latexInput"
        class="math-inline-input"
        :placeholder="t('editor.math.inline.placeholder')"
        spellcheck="false"
        @keydown="handleKeydown"
        @blur="finishEdit"
      />
    </span>
  </node-view-wrapper>
</template>

<style lang="scss" scoped>
.math-inline-wrapper {
  display: inline;
}

.math-inline-display {
  cursor: pointer;
  padding: 1px 2px;
  border-radius: 3px;
  transition: background 0.15s;
  overflow: hidden;

  :deep(.katex) {
    overflow: hidden;
  }

  &:hover {
    background: var(--color-math-inline-hover);
  }

  &.is-selected {
    background: var(--color-math-inline-selected);
    outline: 1px solid var(--color-math-inline-outline);
    outline-offset: 1px;
    border-radius: 3px;
  }
}

.math-inline-placeholder {
  color: var(--color-math-placeholder);
  font-style: italic;
  font-size: 0.9em;
}

.math-inline-edit {
  display: inline-flex;
  align-items: center;
}

.math-inline-input {
  border: 1px solid var(--color-math-border);
  border-radius: 3px;
  padding: 1px 6px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85em;
  line-height: 1.4;
  background: var(--color-math-header-bg);
  outline: none;
  min-width: 60px;
  max-width: 300px;
  color: var(--color-math-text);
}

:deep(.math-error) {
  color: #ef4444;
  font-size: 0.85em;
  font-family: monospace;
}
</style>
