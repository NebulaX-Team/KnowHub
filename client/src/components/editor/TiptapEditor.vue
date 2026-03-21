<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { CustomLink } from './extensions/custom-link'
import {
  Table,
  TableCell as BaseTableCell,
  TableHeader as BaseTableHeader,
  TableRow,
} from '@tiptap/extension-table'
import { ImageBlock } from './extensions/image-block'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { CodeBlockWithCopy } from './extensions/code-block'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import SlashCommand from './extensions/slash-command'
import PageReference from './extensions/page-reference'
import { Admonition } from './extensions/admonition'
import { MathBlock, MathInline } from './extensions/math-block'
import { PageBreak } from './extensions/page-break'
import { common, createLowlight } from 'lowlight'
import 'katex/dist/katex.min.css'
import { ref, nextTick, onBeforeUnmount, onMounted, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NIcon, useMessage } from 'naive-ui'
import { useRouter, useRoute } from 'vue-router'
import { uploadApi } from '@/api/upload'
import {
  CodeSlashOutline as CodeSlash,
  ListOutline as List,
  ListCircleOutline as ListCircle,
  ChatboxEllipsesOutline,
  ArrowBackOutline,
  ArrowForwardOutline,
  ArrowUpOutline,
  ArrowDownOutline,
  TrashOutline,
  GitMergeOutline,
  GitNetworkOutline,
  RemoveCircleOutline,
  LinkOutline,
} from '@vicons/ionicons5'

import ImageUploaderPopover from './ImageUploaderPopover.vue'
import MarkdownImporter from './MarkdownImporter.vue'
import TableOfContents from './TableOfContents.vue'
import LinkBubbleMenu from './LinkBubbleMenu.vue'
import { marked } from 'marked'
import { processLatexInMarkdown, containsLatex } from '@/utils/latex-parser'

const lowlight = createLowlight(common)
const message = useMessage()
const { t } = useI18n()

const normalizeTableAlign = (value: string | null | undefined) => {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return normalized === 'left' || normalized === 'center' || normalized === 'right'
    ? normalized
    : null
}

const createTableAlignAttribute = () => ({
  default: null,
  parseHTML: (element: HTMLElement) => normalizeTableAlign(
    element.getAttribute('align') || element.style.textAlign || null,
  ),
  renderHTML: (attributes: { align?: string | null }) => {
    const align = normalizeTableAlign(attributes.align)
    return align ? { align } : {}
  },
})

const TableCell = BaseTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: createTableAlignAttribute(),
    }
  },
})

const TableHeader = BaseTableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: createTableAlignAttribute(),
    }
  },
})

interface Props {
  content?: any
  editable?: boolean
  pageId?: string
  libraryId?: string
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  editable: true,
})

const emit = defineEmits<{
  (e: 'update', content: any): void
}>()

const router = useRouter()
const route = useRoute()

const showImageUploader = ref(false)
const uploaderPosition = ref({ top: 0, bottom: 0, left: 0 })
const wrapperRef = ref<HTMLElement | null>(null)
const showMarkdownImporter = ref(false)
const linkBubbleRef = ref<InstanceType<typeof LinkBubbleMenu> | null>(null)

// Debug props
console.debug('TiptapEditor props:', { pageId: props.pageId, libraryId: props.libraryId });
console.debug('TiptapEditor content type:', typeof props.content);
console.debug('TiptapEditor content:', props.content);

const handleOpenImageUploader = (e: Event) => {
    const customEvent = e as CustomEvent
    const { left, bottom, top } = customEvent.detail.pos
    
    console.debug('handleOpenImageUploader - props:', { pageId: props.pageId, libraryId: props.libraryId });
    
    if (wrapperRef.value) {
        const wrapperRect = wrapperRef.value.getBoundingClientRect()
        uploaderPosition.value = { 
            top: top - wrapperRect.top,
            bottom: bottom - wrapperRect.top,
            left: left - wrapperRect.left 
        }
    } else {
        uploaderPosition.value = { top: top, bottom: bottom, left: left }
    }
    showImageUploader.value = true
}

const handleInsertImage = (url: string) => {
    if (editor.value) {
        editor.value.chain().focus().setImage({ src: url }).run()
    }
}

const handleOpenMarkdownImporter = () => {
    showMarkdownImporter.value = true
}

const normalizeTableBar = (line: string) => line.replace(/｜/g, '|')

const isPipeTableLine = (line: string) => {
  const normalized = normalizeTableBar(line).trim()
  if (!normalized) return false
  const pipeCount = (normalized.match(/\|/g) || []).length
  return pipeCount >= 2
}

const isTableSeparatorLine = (line: string) => {
  const normalized = normalizeTableBar(line).trim()
  if (!normalized.includes('|')) return false
  const cells = normalized
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean)

  if (cells.length === 0) return false
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

const normalizePipeTableLine = (line: string) => {
  const normalized = normalizeTableBar(line).trim()
  if (!normalized) return ''

  let row = normalized
  if (!row.startsWith('|')) row = `| ${row}`
  if (!row.endsWith('|')) row = `${row} |`
  return row
}

const findNextNonEmptyLineIndex = (lines: string[], start: number) => {
  let index = start
  while (index < lines.length) {
    if (lines[index].trim()) return index
    index += 1
  }
  return -1
}

const looksLikeTableHeaderStart = (lines: string[], index: number) => {
  if (index < 0 || index >= lines.length) return false
  const headerLine = lines[index]
  if (!isPipeTableLine(headerLine) || isTableSeparatorLine(headerLine)) return false

  const separatorIndex = findNextNonEmptyLineIndex(lines, index + 1)
  if (separatorIndex === -1) return false
  return isTableSeparatorLine(lines[separatorIndex])
}

const normalizeLooseMarkdownTables = (content: string) => {
  const lines = content.split(/\r?\n/)
  const result: string[] = []

  let i = 0
  while (i < lines.length) {
    if (!isPipeTableLine(lines[i])) {
      result.push(lines[i])
      i += 1
      continue
    }

    const tableLines: string[] = []
    let j = i

    while (j < lines.length) {
      const current = lines[j]

      if (!current.trim()) {
        const k = findNextNonEmptyLineIndex(lines, j + 1)

        if (k < lines.length && tableLines.length > 0 && isPipeTableLine(lines[k])) {
          const separatorIndex = tableLines.findIndex(isTableSeparatorLine)
          const hasSeparator = separatorIndex !== -1

          // Keep blank line if a complete table is followed by another table header,
          // so two tables are not merged into one malformed table.
          if (hasSeparator && looksLikeTableHeaderStart(lines, k)) {
            break
          }

          j = k
          continue
        }
        break
      }

      if (!isPipeTableLine(current)) {
        break
      }

      tableLines.push(normalizePipeTableLine(current))
      j += 1
    }

    if (tableLines.length >= 2 && tableLines.some(isTableSeparatorLine)) {
      result.push(...tableLines)
      i = j
      continue
    }

    result.push(lines[i])
    i += 1
  }

  return result.join('\n')
}

const looksLikeMarkdown = (content: string) => {
  const text = normalizeTableBar(content).trim()
  if (!text) return false

  const blockPatterns = [
    /^\s{0,3}#{1,6}\s+\S+/m,
    /^\s{0,3}>\s+\S+/m,
    /^\s{0,3}([-*+]|\d+\.)\s+\S+/m,
    /^\s{0,3}```[\w-]*\n[\s\S]*?\n```/m,
    /^\s{0,3}\|.+\|\s*$/m,
    /^\s{0,3}[-*_]{3,}\s*$/m,
  ]

  if (blockPatterns.some((pattern) => pattern.test(text))) {
    return true
  }

  const inlinePatterns = [
    /!\[[^\]]*\]\([^)]+\)/,
    /\[[^\]]+\]\([^)]+\)/,
    /(^|[^\*])\*\*[^*\n]+\*\*([^\*]|$)/,
    /(^|[^_])__[^_\n]+__([^_]|$)/,
    /(^|[^\*])\*[^*\n]+\*([^\*]|$)/,
    /(^|[^_])_[^_\n]+_([^_]|$)/,
    /`[^`\n]+`/,
    /~~[^~\n]+~~/,
  ]

  const inlineSignalCount = inlinePatterns.reduce((count, pattern) => (
    pattern.test(text) ? count + 1 : count
  ), 0)

  if (inlineSignalCount >= 2) {
    return true
  }

  return text.includes('\n') && inlineSignalCount >= 1
}

const escapeHtmlForAttribute = (text: string) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const convertFencedMathBlocks = (content: string) => content.replace(
  /```(?:math|katex|latex)\s*\n([\s\S]*?)```/gi,
  (_match, latex) => {
    const normalized = String(latex || '').trim()
    const escapedLatex = escapeHtmlForAttribute(normalized)
    return `<div data-math-block="" data-latex="${escapedLatex}"></div>`
  },
)

const convertPageBreakMarkers = (content: string) => content.replace(
  /^\s*\[={3,}\]\s*$/gm,
  '\n<div data-page-break="true"></div>\n',
)

const normalizeImportedHtml = (html: string) => {
  if (!html.trim()) return html

  const doc = new DOMParser().parseFromString(`<div id="__md_root__">${html}</div>`, 'text/html')
  const root = doc.getElementById('__md_root__')
  if (!root) return html

  // Convert GFM task list HTML into Tiptap task list schema.
  const uls = Array.from(root.querySelectorAll('ul'))
  for (const ul of uls) {
    const listItems = Array.from(ul.children).filter(
      (child): child is HTMLLIElement => child instanceof HTMLLIElement,
    )

    let hasTaskItems = false

    for (const li of listItems) {
      const checkbox = li.querySelector(':scope > input[type="checkbox"]') as HTMLInputElement | null
      if (!checkbox) continue

      hasTaskItems = true
      li.setAttribute('data-type', 'taskItem')
      li.setAttribute('data-checked', checkbox.hasAttribute('checked') ? 'true' : 'false')
      checkbox.remove()

      const first = li.firstChild
      if (first && first.nodeType === Node.TEXT_NODE) {
        first.textContent = (first.textContent || '').replace(/^\s+/, '')
      }

      const firstElement = li.firstElementChild
      if (!firstElement || firstElement.tagName !== 'P') {
        const paragraph = doc.createElement('p')
        while (
          li.firstChild
          && !(li.firstChild instanceof HTMLElement && (li.firstChild.tagName === 'UL' || li.firstChild.tagName === 'OL'))
        ) {
          paragraph.appendChild(li.firstChild)
        }

        if (paragraph.textContent?.trim() || paragraph.children.length > 0) {
          li.insertBefore(paragraph, li.firstChild)
        }
      }
    }

    if (hasTaskItems) {
      ul.setAttribute('data-type', 'taskList')
    }
  }

  return root.innerHTML
}

const markdownToHtml = async (content: string) => {
  let processedContent = normalizeLooseMarkdownTables(content)
  processedContent = convertFencedMathBlocks(processedContent)
  processedContent = convertPageBreakMarkers(processedContent)
  if (containsLatex(processedContent)) {
    processedContent = processLatexInMarkdown(processedContent)
  }
  const html = await marked.parse(processedContent, { gfm: true })
  return normalizeImportedHtml(html)
}

const insertMarkdownAtSelection = async (content: string) => {
  if (!editor.value) return false

  const html = await markdownToHtml(content)
  const { from, to } = editor.value.state.selection
  editor.value.chain().focus().insertContentAt({ from, to }, html).run()
  return true
}

// Handle page reference clicks
const handlePageReferenceClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const refEl = target.closest('a[data-type="page-reference"]') as HTMLAnchorElement | null
  if (!refEl) return
  
  // In editable mode, require Ctrl/Cmd+Click to navigate
  if (props.editable && !event.ctrlKey && !event.metaKey) return
  
  event.preventDefault()
  event.stopPropagation()
  
  const pageId = refEl.getAttribute('data-id')
  if (!pageId) return
  
  // Determine if we're in public mode
  const isPublicMode = route.path.startsWith('/public')
  
  if (isPublicMode) {
    // In public mode, navigate to public page (API supports both slug and id)
    router.push(`/public/pages/${pageId}`)
  } else {
    // In editor/auth mode, navigate to the page
    router.push(`/page/${pageId}`)
  }
}

const handleImportMarkdown = async (content: string) => {
    if (editor.value) {
        try {
            await insertMarkdownAtSelection(content)
            message.success(t('editor.markdownImporter.importSuccess'))
        } catch (error) {
            console.error('Failed to parse markdown:', error)
            message.error(t('editor.markdownImporter.importFailed'))
        }
    }
}

onMounted(() => {
    window.addEventListener('open-image-uploader', handleOpenImageUploader)
    window.addEventListener('open-markdown-importer', handleOpenMarkdownImporter)
    // Listen for page reference clicks on the wrapper
    wrapperRef.value?.addEventListener('click', handlePageReferenceClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('open-image-uploader', handleOpenImageUploader)
  window.removeEventListener('open-markdown-importer', handleOpenMarkdownImporter)
  wrapperRef.value?.removeEventListener('click', handlePageReferenceClick)
  // editor.value?.destroy() // useEditor handles destruction automatically
})

// Toggle link on selected text via bubble menu
const toggleLink = () => {
  if (!editor.value) return
  if (editor.value.isActive('link')) {
    editor.value.chain().focus().unsetLink().run()
  } else {
    const url = ''
    // Set an empty link first, then show the edit popover
    editor.value.chain().focus().setLink({ href: url }).run()
    // After setting the link, find the link element and show the bubble menu for editing
    nextTick(() => {
      const { state } = editor.value!
      const { from } = state.selection
      const resolved = state.doc.resolve(from)
      const marks = resolved.marks()
      const linkMark = marks.find(m => m.type.name === 'link')
      if (linkMark) {
        // Find the DOM element for the current selection
        const domAtPos = editor.value!.view.domAtPos(from)
        const parentEl = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement
        const linkEl = parentEl?.closest('span.editor-link') || parentEl?.querySelector('span.editor-link')
        if (linkEl) {
          const text = linkEl.textContent || ''
          linkBubbleRef.value?.show(url, text, linkEl as HTMLElement, true)
        }
      }
    })
  }
}

const editor = useEditor({
  content: props.content ? toRaw(props.content) : '',
  editable: props.editable,
  extensions: [
    StarterKit.configure({
      codeBlock: false, // Disable default codeBlock to use lowlight
    }),
    Placeholder.configure({
      placeholder: t('editor.placeholder'),
    }),
    CustomLink.configure({
      openOnClick: false,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    ImageBlock,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    CodeBlockWithCopy.configure({
      lowlight,
    }),
    BubbleMenuExtension,
    SlashCommand,
    PageReference,
    Admonition,
    MathBlock,
    MathInline,
    PageBreak,
  ],
  onUpdate: ({ editor }: { editor: any }) => {
    emit('update', editor.getJSON())
  },
  editorProps: {
    handleClick: (_view, _pos, event) => {
      const target = event.target as HTMLElement
      const refEl = target.closest('a[data-type="page-reference"]') as HTMLAnchorElement | null
      if (refEl) {
        // Prevent ProseMirror default handling for page references
        event.preventDefault()
        return true
      }
      // Handle click on editor-link: show link bubble menu
      const linkEl = target.closest('span.editor-link') as HTMLElement | null
      if (linkEl && !event.ctrlKey && !event.metaKey) {
        const href = linkEl.getAttribute('data-link-href') || ''
        const text = linkEl.textContent || ''
        linkBubbleRef.value?.show(href, text, linkEl)
        return true
      }
      // Click outside a link — hide popover
      linkBubbleRef.value?.hide()
      return false
    },
    handleDrop: (view, event, _ , moved) => {
      if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
        const file = event.dataTransfer.files[0]
        if (file.type.startsWith('image/')) {
          event.preventDefault() // Prevent default browser behavior (download)
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
          if (coordinates) {
             console.debug('handleDrop - uploading with pageId:', props.pageId, 'libraryId:', props.libraryId);
             uploadApi.uploadImage(file, props.pageId, props.libraryId).then(res => {
                 const url = res.url || (res.data && res.data.url)
                 if (url) {
                    editor.value?.chain()
                      .insertContentAt(coordinates.pos, {
                        type: 'image',
                        attrs: { src: url }
                      })
                      .run()
                 }
             }).catch(err => {
                 console.error(err)
                 message.error(t('editor.imageUploader.messages.uploadFailed'))
             })
             return true
          }
        }
      }
      return false
    },
    handlePaste: (_view, event) => {
      if (!props.editable || !editor.value) return false

      const clipboardData = event.clipboardData
      if (!clipboardData) return false

      if (clipboardData.files && clipboardData.files.length > 0) {
        return false
      }

      const text = clipboardData.getData('text/plain')
      if (!text || !looksLikeMarkdown(text)) {
        return false
      }

      event.preventDefault()
      void insertMarkdownAtSelection(text).catch((error) => {
        console.error('Failed to parse pasted markdown:', error)
        editor.value?.chain().focus().insertContent(text).run()
      })
      return true
    }
  }
})

// Watch for content changes (e.g., when restoring a version)
// Only update if content is actually different to avoid cursor jumps during auto-save
let lastContentHash = ''
watch(() => props.content, (newContent) => {
  console.debug('TiptapEditor content changed:', newContent);
  console.debug('TiptapEditor content type:', typeof newContent);

  if (editor.value && newContent) {
    // Create a simple hash to compare content
    const contentString = JSON.stringify(newContent)
    const currentHash = editor.value.getJSON ? JSON.stringify(editor.value.getJSON()) : ''

    // Only update if content is different and not just a re-render
    if (contentString !== currentHash && contentString !== lastContentHash) {
      console.debug('Updating editor content (content actually changed)');
      editor.value.commands.setContent(toRaw(newContent))
      lastContentHash = contentString
    } else {
      console.debug('Skipping editor update (content unchanged)');
    }
  }
})

</script>

<template>
  <div class="editor-wrapper" ref="wrapperRef">
    <table-of-contents :editor="editor" />
    <image-uploader-popover
      :visible="showImageUploader"
      :position="uploaderPosition"
      :page-id="pageId"
      :library-id="libraryId"
      @close="showImageUploader = false"
      @insert="handleInsertImage"
    />
    
    <markdown-importer
      v-model:show="showMarkdownImporter"
      @import="handleImportMarkdown"
    />
    
    <bubble-menu
      v-if="editor && editable"
      :editor="editor"
      :tippy-options="{ duration: 100, appendTo: 'parent' }"
      :should-show="({ state }) => {
        const { selection } = state
        return !selection.empty && selection instanceof TextSelection
      }"
      class="bubble-menu"
    >
      <button
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor.isActive('bold') }"
        :title="t('editor.bubble.bold')"
      >
        B
      </button>
      <button
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        :title="t('editor.bubble.italic')"
      >
        I
      </button>
      <button
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }"
        :title="t('editor.bubble.strike')"
      >
        S
      </button>
      <button
        @click="editor.chain().focus().toggleCode().run()"
        :class="{ 'is-active': editor.isActive('code') }"
        :title="t('editor.bubble.code')"
      >
        <n-icon><CodeSlash /></n-icon>
      </button>
      
      <div class="divider"></div>
      
      <button
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
        :title="t('editor.bubble.heading1')"
      >
        H1
      </button>
      <button
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        :title="t('editor.bubble.heading2')"
      >
        H2
      </button>
      <button
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        :title="t('editor.bubble.heading3')"
      >
        H3
      </button>
      
      <div class="divider"></div>
      
      <button
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        :title="t('editor.bubble.bulletList')"
      >
        <n-icon><List /></n-icon>
      </button>
      <button
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        :title="t('editor.bubble.orderedList')"
      >
        <n-icon><ListCircle /></n-icon>
      </button>
      <button
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="{ 'is-active': editor.isActive('blockquote') }"
        :title="t('editor.bubble.blockquote')"
      >
        <n-icon><ChatboxEllipsesOutline /></n-icon>
      </button>
      
      <div class="divider"></div>
      
      <button
        @click="toggleLink"
        :class="{ 'is-active': editor.isActive('link') }"
        :title="t('editor.bubble.link')"
      >
        <n-icon><LinkOutline /></n-icon>
      </button>
    </bubble-menu>

    <bubble-menu
      v-if="editor && editable"
      :editor="editor"
      :tippy-options="{ duration: 100, appendTo: 'parent' }"
      :should-show="({ editor, state }) => {
        const { selection } = state
        const isTable = editor.isActive('table')
        const isText = selection instanceof TextSelection
        if (!isTable) return false
        if (isText && !selection.empty) return false
        return true
      }"
      class="bubble-menu table-menu"
    >
      <button @click="editor.chain().focus().addColumnBefore().run()" :title="t('editor.tableMenu.addColumnBefore')">
        <n-icon><ArrowBackOutline /></n-icon>
      </button>
      <button @click="editor.chain().focus().addColumnAfter().run()" :title="t('editor.tableMenu.addColumnAfter')">
        <n-icon><ArrowForwardOutline /></n-icon>
      </button>
      <button @click="editor.chain().focus().deleteColumn().run()" :title="t('editor.tableMenu.deleteColumn')">
        <n-icon><RemoveCircleOutline /></n-icon>
      </button>
      <div class="divider"></div>
      <button @click="editor.chain().focus().addRowBefore().run()" :title="t('editor.tableMenu.addRowBefore')">
        <n-icon><ArrowUpOutline /></n-icon>
      </button>
      <button @click="editor.chain().focus().addRowAfter().run()" :title="t('editor.tableMenu.addRowAfter')">
        <n-icon><ArrowDownOutline /></n-icon>
      </button>
      <button @click="editor.chain().focus().deleteRow().run()" :title="t('editor.tableMenu.deleteRow')">
        <n-icon><RemoveCircleOutline /></n-icon>
      </button>
      <div class="divider"></div>
      <button @click="editor.chain().focus().mergeCells().run()" :title="t('editor.tableMenu.mergeCells')">
        <n-icon><GitMergeOutline /></n-icon>
      </button>
      <button @click="editor.chain().focus().splitCell().run()" :title="t('editor.tableMenu.splitCell')">
        <n-icon><GitNetworkOutline /></n-icon>
      </button>
      <div class="divider"></div>
      <button
        class="align-btn"
        @click="editor.chain().focus().setCellAttribute('align', 'left').run()"
        :title="t('editor.tableMenu.alignLeft')"
      >
        L
      </button>
      <button
        class="align-btn"
        @click="editor.chain().focus().setCellAttribute('align', 'center').run()"
        :title="t('editor.tableMenu.alignCenter')"
      >
        C
      </button>
      <button
        class="align-btn"
        @click="editor.chain().focus().setCellAttribute('align', 'right').run()"
        :title="t('editor.tableMenu.alignRight')"
      >
        R
      </button>
      <div class="divider"></div>
      <button @click="editor.chain().focus().deleteTable().run()" :title="t('editor.tableMenu.deleteTable')">
        <n-icon><TrashOutline /></n-icon>
      </button>
    </bubble-menu>

    <editor-content :editor="editor" class="editor-content" />
    <link-bubble-menu v-if="editor && editable" ref="linkBubbleRef" :editor="editor" />
  </div>
</template>

<style lang="scss">
.editor-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  
  .bubble-menu {
    display: flex;
    background-color: var(--color-bg-elevated);
    padding: 0.2rem;
    border-radius: 0.5rem;
    box-shadow: var(--shadow-float);
    border: 1px solid var(--color-border);

    button {
      border: none;
      background: none;
      color: var(--color-cmd-btn-text);
      font-size: 0.85rem;
      font-weight: 500;
      padding: 0.4rem 0.6rem;
      border-radius: 0.3rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background-color: var(--color-cmd-btn-hover-bg);
        color: var(--color-cmd-btn-hover-text);
      }

      &.is-active {
        background-color: var(--color-cmd-btn-active-bg);
        color: var(--color-cmd-btn-hover-text);
      }
    }
    
    .divider {
      width: 1px;
      background-color: var(--color-border);
      margin: 0 0.2rem;
    }
  }

  .table-menu .align-btn {
    min-width: 30px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .editor-content {
    height: 100%;
    outline: none;
    
    .ProseMirror {
      outline: none;
      min-height: 150px;
      padding-bottom: 100px; /* Space for scrolling */
      
      /* Typography based on InterfaceDesign.md */
      font-size: 14px;
      line-height: 1.6;
      color: var(--color-text-body);
      
      p {
        margin-bottom: 1em;
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-weight: 600;
        line-height: 1.3;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        color: var(--color-text-heading);
      }
      
      h1 { font-size: 32px; }
      h2 { font-size: 24px; }
      h3 { font-size: 20px; }
      h4 { font-size: 16px; }
      
      ul, ol {
        padding-left: 1.5em;
        margin-bottom: 1em;
      }
      
      li {
        margin-bottom: 0.5em;
      }
      
      /* Task List */
      ul[data-type="taskList"] {
        list-style: none;
        padding: 0;
        
        li {
          display: flex;
          align-items: flex-start;
          
          > label {
            margin-right: 0.5em;
            user-select: none;
            input {
              margin-top: 0.3em;
            }
          }
          
          > div {
            flex: 1;
          }
        }
      }
      
      /* Inline Code — only style code that is NOT inside a pre (code block) */
      code:not(pre code) {
        font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Menlo", "Monaco", "Courier New", monospace;
        font-size: 0.9em;
        background-color: var(--color-bg-inline-code);
        border-radius: 4px;
        padding: 0.15em 0.4em;
        margin: 0 0.1em;
        color: var(--color-text-code);
      }

      /* Code Block styles moved to CodeBlockView.vue */
      
      /* Blockquote */
      blockquote {
        border-left: 3px solid var(--color-blockquote-border);
        margin-left: 0;
        padding-left: 1em;
        color: var(--color-blockquote-text);
      }

      /* Admonitions */
      [data-admonition] {
        margin: 1em 0;

        .admonition-content {
          border-radius: 8px;
          border: 1px solid;
          padding: 12px 16px;
          position: relative;

          .admonition-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 14px;

            .admonition-title {
              font-weight: 600;
            }
          }

          .admonition-body {
            font-size: 14px;
            line-height: 1.6;
            color: var(--color-admonition-body);

            p {
              margin: 0;

              &:first-child {
                margin-top: 0;
              }

              &:last-child {
                margin-bottom: 0;
              }
            }
          }
        }
      }
      
      /* Placeholder */
      p.is-editor-empty:first-child::before {
        color: var(--color-text-faint);
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
      }
      
      /* Links — rendered as <span> to prevent browser default link behavior */
      span.editor-link {
        color: var(--color-text-link);
        text-decoration: none;
        border-bottom: 1px solid var(--color-link-underline);
        cursor: pointer;
        transition: background-color 0.15s, border-color 0.15s;
        padding-bottom: 1px;
        
        &:hover {
          background-color: var(--color-link-hover-bg);
          border-bottom-color: var(--color-text-link);
        }
      }

      /* Page References */
      a.page-reference {
        color: var(--color-text-link);
        background-color: var(--color-page-ref-bg);
        border-radius: 4px;
        padding: 1px 4px;
        text-decoration: none;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.15s ease;
        
        &:hover {
          background-color: var(--color-page-ref-hover);
          text-decoration: none;
        }
      }
      
      /* Images */
      img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
      }

      /* Page Break */
      [data-page-break="true"] {
        display: block;
        margin: 18px 0;
        border: 0;
        border-top: 2px dashed var(--color-border);
        position: relative;
        height: 0;

        &::before {
          content: 'Page Break';
          position: absolute;
          top: -10px;
          right: 10px;
          padding: 0 6px;
          font-size: 11px;
          line-height: 1.2;
          color: var(--color-text-secondary);
          background: var(--color-bg-editor);
        }
      }

      /* Table Styles */
      table {
        border-collapse: collapse;
        table-layout: fixed;
        width: 100%;
        margin: 14px 0;
        overflow: hidden;

        td,
        th {
          min-width: 1em;
          border: 2px solid var(--color-border-table);
          padding: 3px 5px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;

          > * {
            margin-bottom: 0;
          }
        }

        th {
          font-weight: bold;
          background-color: var(--color-bg-table-th);
        }

        th:not([align]) {
          text-align: left;
        }

        th[align="left"],
        td[align="left"] {
          text-align: left;
        }

        th[align="center"],
        td[align="center"] {
          text-align: center;
        }

        th[align="right"],
        td[align="right"] {
          text-align: right;
        }

        .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: var(--color-bg-table-selected);
          pointer-events: none;
        }

        .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background-color: var(--color-bg-table-resize);
          pointer-events: none;
        }
      }
    }
  }
}

@media print {
  .editor-wrapper,
  .editor-wrapper .editor-content,
  .editor-wrapper .editor-content .ProseMirror {
    height: auto !important;
    min-height: auto !important;
    overflow: visible !important;
  }

  .editor-wrapper .ProseMirror [data-page-break="true"] {
    display: block !important;
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
    height: 0 !important;
    min-height: 0 !important;
    visibility: hidden !important;
  }

  .editor-wrapper .ProseMirror [data-page-break="true"]::before {
    content: '';
  }

  .editor-wrapper .ProseMirror [data-page-break="true"] + * {
    break-before: page !important;
    page-break-before: always !important;
  }
}
</style>
