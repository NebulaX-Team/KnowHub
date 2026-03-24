import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import InlineImageView from './InlineImageView.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineImage: {
      setInlineImage: (attrs: { src: string; alt?: string; title?: string }) => ReturnType
    }
  }
}

export const InlineImage = Node.create({
  name: 'inlineImage',
  inline: true,
  group: 'inline',
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {}
          return { width: attributes.width }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-type="inline-image"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-image' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(InlineImageView)
  },

  addCommands() {
    return {
      setInlineImage: (attrs) => ({ chain }) => {
        return chain().insertContent({
          type: this.name,
          attrs,
        }).run()
      },
    }
  },
})
