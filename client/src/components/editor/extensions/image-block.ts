import Image from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ImageBlockView from './ImageBlockView.vue'

export const ImageBlock = Image.extend({
  inline: true,
  group: 'inline',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {}
          }
          return {
            width: attributes.width,
          }
        },
      },
    }
  },
  addNodeView() {
    return VueNodeViewRenderer(ImageBlockView)
  },
})
