import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import { i18n } from '@/i18n'
import CommandList from '../CommandList.vue'
import {
  TextOutline,
  ListOutline,
  ListCircleOutline,
  CheckboxOutline,
  CodeSlashOutline,
  ChatboxEllipsesOutline,
  ImageOutline,
  GridOutline,
  DocumentTextOutline,
  InformationCircleOutline,
  WarningOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  CalculatorOutline,
} from '@vicons/ionicons5'

export interface CommandItem {
  title: string
  description?: string
  icon?: any
  group: string
  keywords?: string[]
  children?: CommandItem[]
  command?: (params: { editor: any; range: any }) => void
}

const tr = (key: string) => i18n.global.t(key) as string

const getAllItems = (): CommandItem[] => {
  const headingItems: CommandItem[] = [
    {
      title: tr('editor.slash.items.heading1.title'),
      description: tr('editor.slash.items.heading1.description'),
      icon: TextOutline,
      group: tr('editor.slash.groups.headings'),
      keywords: ['h1', 'title', 'big', '标题', '一级'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
      },
    },
    {
      title: tr('editor.slash.items.heading2.title'),
      description: tr('editor.slash.items.heading2.description'),
      icon: TextOutline,
      group: tr('editor.slash.groups.headings'),
      keywords: ['h2', 'subtitle', '二级'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
      },
    },
    {
      title: tr('editor.slash.items.heading3.title'),
      description: tr('editor.slash.items.heading3.description'),
      icon: TextOutline,
      group: tr('editor.slash.groups.headings'),
      keywords: ['h3', 'subheading', '三级'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
      },
    },
    {
      title: tr('editor.slash.items.heading4.title'),
      description: tr('editor.slash.items.heading4.description'),
      icon: TextOutline,
      group: tr('editor.slash.groups.headings'),
      keywords: ['h4', '标题', '四级'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run()
      },
    },
    {
      title: tr('editor.slash.items.heading5.title'),
      description: tr('editor.slash.items.heading5.description'),
      icon: TextOutline,
      group: tr('editor.slash.groups.headings'),
      keywords: ['h5', '标题', '五级'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 5 }).run()
      },
    },
    {
      title: tr('editor.slash.items.heading6.title'),
      description: tr('editor.slash.items.heading6.description'),
      icon: TextOutline,
      group: tr('editor.slash.groups.headings'),
      keywords: ['h6', '标题', '六级'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 6 }).run()
      },
    },
  ]

  const listItems: CommandItem[] = [
    {
      title: tr('editor.slash.items.bulletList.title'),
      description: tr('editor.slash.items.bulletList.description'),
      icon: ListOutline,
      group: tr('editor.slash.groups.lists'),
      keywords: ['ul', 'unordered', 'bullet', '列表', '无序'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
    },
    {
      title: tr('editor.slash.items.orderedList.title'),
      description: tr('editor.slash.items.orderedList.description'),
      icon: ListCircleOutline,
      group: tr('editor.slash.groups.lists'),
      keywords: ['ol', 'numbered', 'number', '有序'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
    },
    {
      title: tr('editor.slash.items.taskList.title'),
      description: tr('editor.slash.items.taskList.description'),
      icon: CheckboxOutline,
      group: tr('editor.slash.groups.lists'),
      keywords: ['todo', 'checkbox', 'check', '任务', '待办'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run()
      },
    },
  ]

  const blockItems: CommandItem[] = [
    {
      title: tr('editor.slash.items.codeBlock.title'),
      description: tr('editor.slash.items.codeBlock.description'),
      icon: CodeSlashOutline,
      group: tr('editor.slash.groups.blocks'),
      keywords: ['code', 'pre', 'syntax', 'snippet', '代码'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      },
    },
    {
      title: tr('editor.slash.items.blockquote.title'),
      description: tr('editor.slash.items.blockquote.description'),
      icon: ChatboxEllipsesOutline,
      group: tr('editor.slash.groups.blocks'),
      keywords: ['quote', 'cite', '引用'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
    },
  ]

  const calloutItems: CommandItem[] = [
    {
      title: tr('editor.slash.items.info.title'),
      description: tr('editor.slash.items.info.description'),
      icon: InformationCircleOutline,
      group: tr('editor.slash.groups.callouts'),
      keywords: ['admonition', 'info', 'note', 'tip', '信息', '提示'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertAdmonition({ type: 'info' }).run()
      },
    },
    {
      title: tr('editor.slash.items.warning.title'),
      description: tr('editor.slash.items.warning.description'),
      icon: WarningOutline,
      group: tr('editor.slash.groups.callouts'),
      keywords: ['admonition', 'warning', 'caution', 'alert', '警告'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertAdmonition({ type: 'warning' }).run()
      },
    },
    {
      title: tr('editor.slash.items.success.title'),
      description: tr('editor.slash.items.success.description'),
      icon: CheckmarkCircleOutline,
      group: tr('editor.slash.groups.callouts'),
      keywords: ['admonition', 'success', 'done', 'complete', '成功'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertAdmonition({ type: 'success' }).run()
      },
    },
    {
      title: tr('editor.slash.items.danger.title'),
      description: tr('editor.slash.items.danger.description'),
      icon: CloseCircleOutline,
      group: tr('editor.slash.groups.callouts'),
      keywords: ['admonition', 'danger', 'error', 'critical', '危险'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertAdmonition({ type: 'danger' }).run()
      },
    },
  ]

  const flowchartItem: CommandItem = {
    title: tr('editor.slash.items.flowchart.title'),
    description: tr('editor.slash.items.flowchart.description'),
    icon: CodeSlashOutline,
    group: tr('editor.slash.groups.insert'),
    keywords: ['flow', 'flowchart', 'diagram', '流程图', '图表'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: 'codeBlock',
        attrs: { language: 'flow' },
        content: [{
          type: 'text',
          text: [
            'st=>start: Start',
            'op=>operation: Action',
            'cond=>condition: Success?',
            'e=>end: Done',
            '',
            'st->op->cond',
            'cond(yes)->e',
            'cond(no)->op',
          ].join('\n'),
        }],
      }).run()
    },
  }

  const sequenceDiagramItem: CommandItem = {
    title: tr('editor.slash.items.sequenceDiagram.title'),
    description: tr('editor.slash.items.sequenceDiagram.description'),
    icon: CodeSlashOutline,
    group: tr('editor.slash.groups.insert'),
    keywords: ['seq', 'sequence', 'diagram', '时序图', '序列图'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: 'codeBlock',
        attrs: { language: 'seq' },
        content: [{
          type: 'text',
          text: [
            'Alice->Bob: Hello',
            'Note right of Bob: Thinking...',
            'Bob-->Alice: Hi!',
          ].join('\n'),
        }],
      }).run()
    },
  }

  const blockFormulaItem: CommandItem = {
    title: tr('editor.slash.items.blockFormula.title'),
    description: tr('editor.slash.items.blockFormula.description'),
    icon: CalculatorOutline,
    group: tr('editor.slash.groups.insert'),
    keywords: ['math', 'formula', 'equation', 'latex', 'katex', 'block', '公式', '块'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertMathBlock().run()
    },
  }

  const inlineFormulaItem: CommandItem = {
    title: tr('editor.slash.items.inlineFormula.title'),
    description: tr('editor.slash.items.inlineFormula.description'),
    icon: CalculatorOutline,
    group: tr('editor.slash.groups.insert'),
    keywords: ['math', 'formula', 'inline', 'latex', 'katex', '行内', '公式'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertMathInline().run()
    },
  }

  const insertItems: CommandItem[] = [
    {
      title: tr('editor.slash.items.image.title'),
      description: tr('editor.slash.items.image.description'),
      icon: ImageOutline,
      group: tr('editor.slash.groups.insert'),
      keywords: ['image', 'picture', 'photo', 'img', '图片'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        const event = new CustomEvent('open-image-uploader', {
          detail: { pos: editor.view.coordsAtPos(editor.state.selection.from) },
        })
        window.dispatchEvent(event)
      },
    },
    {
      title: tr('editor.slash.items.table.title'),
      description: tr('editor.slash.items.table.description'),
      icon: GridOutline,
      group: tr('editor.slash.groups.insert'),
      keywords: ['table', 'grid', 'spreadsheet', '表格'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      },
    },
    {
      title: tr('editor.slash.items.pageBreak.title'),
      description: tr('editor.slash.items.pageBreak.description'),
      icon: DocumentTextOutline,
      group: tr('editor.slash.groups.insert'),
      keywords: ['page', 'break', 'print', '分页', '分页符', '打印'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertPageBreak().run()
      },
    },
    {
      title: tr('editor.slash.items.diagramMenu.title'),
      description: tr('editor.slash.items.diagramMenu.description'),
      icon: GridOutline,
      group: tr('editor.slash.groups.insert'),
      keywords: ['diagram', 'flow', 'seq', '图表', '流程图', '时序图'],
      children: [flowchartItem, sequenceDiagramItem],
    },
    {
      title: tr('editor.slash.items.formulaMenu.title'),
      description: tr('editor.slash.items.formulaMenu.description'),
      icon: CalculatorOutline,
      group: tr('editor.slash.groups.insert'),
      keywords: ['math', 'formula', 'latex', '公式'],
      children: [blockFormulaItem, inlineFormulaItem],
    },
    {
      title: tr('editor.slash.items.importMarkdown.title'),
      description: tr('editor.slash.items.importMarkdown.description'),
      icon: DocumentTextOutline,
      group: tr('editor.slash.groups.insert'),
      keywords: ['markdown', 'md', 'import', 'paste', '导入'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        const event = new CustomEvent('open-markdown-importer', {
          detail: { pos: editor.view.coordsAtPos(editor.state.selection.from) },
        })
        window.dispatchEvent(event)
      },
    },
  ]

  return [...headingItems, ...listItems, ...blockItems, ...calloutItems, ...insertItems]
}

const flattenLeafItems = (items: CommandItem[]): CommandItem[] => items.flatMap((item) => (
  item.children?.length ? flattenLeafItems(item.children) : [item]
))

const getAllSearchableText = (item: CommandItem) => {
  return [
    item.title,
    item.group,
    item.description || '',
    ...(item.keywords || []),
  ].join(' ').toLowerCase()
}

function matchesQuery(item: CommandItem, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase().trim()
  if (!q) return true
  return getAllSearchableText(item).includes(q)
}

const getSuggestionItems = ({ query }: { query: string }) => {
  const allItems = getAllItems()
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return allItems
  }

  return flattenLeafItems(allItems).filter((item) => matchesQuery(item, normalizedQuery))
}

const renderSuggestion = () => {
  let component: any
  let popup: any

  return {
    onStart: (props: any) => {
      component = new VueRenderer(CommandList, {
        props,
        editor: props.editor,
      })

      if (!props.clientRect) {
        return
      }

      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => props.editor.view.dom.parentNode || document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      })
    },

    onUpdate(props: any) {
      component.updateProps(props)

      if (!props.clientRect) {
        return
      }

      popup[0].setProps({
        getReferenceClientRect: props.clientRect,
      })
    },

    onKeyDown(props: any) {
      if (props.event.key === 'Escape') {
        popup[0].hide()

        return true
      }

      return component.ref?.onKeyDown(props)
    },

    onExit() {
      popup[0].destroy()
      component.destroy()
    },
  }
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          if (typeof props.command === 'function') {
            props.command({ editor, range })
          }
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

export default SlashCommand.configure({
  suggestion: {
    items: getSuggestionItems,
    render: renderSuggestion,
  }
})
