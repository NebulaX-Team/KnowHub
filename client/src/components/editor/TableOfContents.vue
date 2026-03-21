<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Editor } from '@tiptap/vue-3'
import { NButton, NIcon, NDrawer, NDrawerContent } from 'naive-ui'
import { ListOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import { useWindowSize } from '@vueuse/core'

const props = defineProps<{
  editor: Editor | undefined
}>()
const { t } = useI18n()

interface TocItem {
  id: string
  level: number
  text: string
  pos: number
  indentLevel: number
}

const items = ref<TocItem[]>([])
const { width } = useWindowSize()
const isMobile = computed(() => width.value < 1024)

// State for visibility
// Desktop: controls whether the sidebar is visible
// Mobile: controls drawer
const visible = ref(true)

// Initialize visible state based on device
watch(isMobile, (mobile) => {
  if (mobile) {
    visible.value = false
  } else {
    visible.value = true
  }
}, { immediate: true })

const updateToc = () => {
    if (!props.editor) return

    const newItems: TocItem[] = []
    const doc = props.editor.state.doc

    doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
            newItems.push({
                id: `heading-${pos}`,
                level: node.attrs.level,
                text: node.textContent,
                pos: pos,
                indentLevel: 0
            })
        }
    })

    if (newItems.length === 0) {
        items.value = []
        return
    }

    // Show full heading hierarchy (H1-H6), and indent based on relative level.
    const minLevel = Math.min(...newItems.map(i => i.level))

    items.value = newItems.map(i => ({
      ...i,
      indentLevel: Math.max(0, i.level - minLevel)
    }))
}

// Watch for editor updates
watch(() => props.editor, (newEditor) => {
    if (newEditor) {
        // Initial update
        updateToc()

        // Listen to updates
        newEditor.on('update', updateToc)
    }
}, { immediate: true })

// Clean up listener
onUnmounted(() => {
    if (props.editor) {
        props.editor.off('update', updateToc)
    }
})

const handleItemClick = (pos: number) => {
    if (!props.editor) return

    // For mobile, close drawer
    if (isMobile.value) {
        visible.value = false
    }

    // Find DOM element and scroll
    // editor.view.domAtPos(pos) might return text node or parent
    // The heading node starts at pos.
    // The DOM mapping in ProseMirror can be tricky.
    // Better relies on the editor to scroll.
    // ProseMirror 'pos' points to the position before the node
    // nodeDOM(pos) should return the DOM node for the node starting at pos
    const dom = props.editor.view.nodeDOM(pos) as HTMLElement

    if (dom && dom.scrollIntoView) {
        dom.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
        // Fallback: try to find element by other means or nearby position
        // domAtPos returns the node containing the position
        const { node } = props.editor.view.domAtPos(pos + 1)
        if (node instanceof HTMLElement) {
           node.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else if (node.parentElement) {
           node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }
}

const toggle = () => {
    visible.value = !visible.value
}
</script>

<template>
    <div class="toc-container">
        <!-- Floating Toggle Button -->
        <transition name="fade">
            <div
                v-if="!visible || (visible && isMobile)"
                class="toc-toggle-btn"
                @click="toggle"
            >
                <n-icon size="24" :component="ListOutline" />
            </div>
        </transition>

        <!-- Desktop Sidebar -->
        <transition name="slide-right">
            <div
                v-if="!isMobile && visible"
                class="toc-sidebar"
            >
                <div class="toc-header">
                    <span class="toc-title">{{ t('editor.toc.title') }}</span>
                    <n-button quaternary circle size="small" @click="toggle">
                        <template #icon>
                            <n-icon :component="ChevronForwardOutline" />
                        </template>
                    </n-button>
                </div>
                <div class="toc-content">
                    <div
                        v-for="item in items"
                        :key="item.id"
                        class="toc-item"
                        :style="{ paddingLeft: `${12 + item.indentLevel * 14}px` }"
                        @click="handleItemClick(item.pos)"
                    >
                        {{ item.text }}
                    </div>
                     <div v-if="items.length === 0" class="toc-empty">
                        {{ t('editor.toc.empty') }}
                    </div>
                </div>
            </div>
        </transition>

        <!-- Mobile Drawer -->
         <n-drawer
            v-if="isMobile"
            v-model:show="visible"
            :width="280"
            placement="right"
        >
            <n-drawer-content :title="t('editor.toc.title')" closable>
                 <div class="toc-content">
                     <div
                        v-for="item in items"
                        :key="item.id"
                        class="toc-item"
                        :style="{ paddingLeft: `${12 + item.indentLevel * 14}px` }"
                        @click="handleItemClick(item.pos)"
                    >
                        {{ item.text }}
                    </div>
                    <div v-if="items.length === 0" class="toc-empty">
                        {{ t('editor.toc.empty') }}
                    </div>
                </div>
            </n-drawer-content>
        </n-drawer>
    </div>
</template>

<style scoped lang="scss">
.toc-container {
    /* Container doesn't take space */
}

.toc-toggle-btn {
    position: fixed;
    top: 100px;
    right: 36px;
    z-index: 100;
    width: 40px;
    height: 40px;
    background-color: var(--color-bg-elevated);
    box-shadow: var(--shadow-toc-btn);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        transform: scale(1.1);
        box-shadow: var(--shadow-toc-btn-hover);
    }
}

.toc-sidebar {
    position: fixed;
    top: 100px;
    right: 36px;
    width: 300px;
    max-height: calc(100vh - 140px);
    background-color: var(--color-bg-elevated);
    border-radius: 8px;
    box-shadow: var(--shadow-toc);
    z-index: 90;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 12px 0;
    border: 1px solid var(--color-border-light);
}

.toc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px 8px;
    border-bottom: 1px solid var(--color-border-separator);
    margin-bottom: 8px;

    .toc-title {
        font-weight: 600;
        font-size: 14px;
        color: var(--color-toc-heading);
    }
}

.toc-content {
    overflow-y: auto;
    padding: 0 8px;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: var(--color-scrollbar);
        border-radius: 2px;
    }
}

.toc-item {
    padding: 8px 12px;
    font-size: 13px;
    color: var(--color-toc-text);
    cursor: pointer;
    border-radius: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: all 0.2s;
    margin-bottom: 2px;

    &:hover {
        background-color: var(--color-toc-hover);
        color: var(--color-toc-heading);
    }
}

.toc-empty {
    padding: 20px;
    text-align: center;
    color: var(--color-toc-empty);
    font-size: 13px;
}

/* Transitions */
.slide-right-enter-active,
.slide-right-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
    transform: translateX(20px);
    opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
