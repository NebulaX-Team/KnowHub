<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { ref } from 'vue'

const props = defineProps(nodeViewProps)

const resizing = ref(false)
const resizeStartX = ref(0)
const initialWidth = ref(0)

const onMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  resizing.value = true
  resizeStartX.value = e.clientX

  const img = (e.target as HTMLElement).closest('.inline-image-view') as HTMLElement
  if (img) {
    initialWidth.value = img.offsetWidth
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e: MouseEvent) => {
  if (!resizing.value) return
  const dx = e.clientX - resizeStartX.value
  const newWidth = Math.max(20, initialWidth.value + dx)
  props.updateAttributes({ width: `${newWidth}px` })
}

const onMouseUp = () => {
  resizing.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}
</script>

<template>
  <node-view-wrapper as="span" class="inline-image-wrapper">
    <span
      class="inline-image-view"
      :class="{
        'is-selected': props.selected,
        'is-resizing': resizing,
      }"
      :style="{ width: props.node.attrs.width || undefined }"
    >
      <img
        :src="props.node.attrs.src"
        :alt="props.node.attrs.alt"
        :title="props.node.attrs.title"
      />
      <span
        v-if="props.editor.isEditable"
        class="resize-handle"
        @mousedown.prevent.stop="onMouseDown"
      ></span>
    </span>
  </node-view-wrapper>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as *;

.inline-image-wrapper {
  display: inline;

  .inline-image-view {
    display: inline-block;
    position: relative;
    vertical-align: middle;
    max-width: 100%;
    line-height: 0;

    img {
      width: 100%;
      height: auto;
      border-radius: 3px;
      display: inline-block;
      vertical-align: middle;
    }

    &.is-selected {
      outline: 2px solid $ios-system-blue;
      border-radius: 3px;
    }

    .resize-handle {
      position: absolute;
      right: -8px;
      top: 50%;
      transform: translateY(-50%);
      width: 10px;
      height: 32px;
      cursor: col-resize;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;

      &::after {
        content: '';
        width: 3px;
        height: 16px;
        background-color: var(--color-image-overlay);
        border-radius: 2px;
        opacity: 0;
        transition: opacity 0.2s;
      }
    }

    &:hover .resize-handle::after,
    &.is-selected .resize-handle::after,
    &.is-resizing .resize-handle::after {
      opacity: 1;
    }
  }
}
</style>
