import { Node, mergeAttributes } from '@tiptap/core'
import { resolveMediaUrl } from './mediaHelper'

export interface VideoOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string; controls?: boolean }) => ReturnType
    }
  }
}

export const Video = Node.create<VideoOptions>({
  name: 'video',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('src'),
        renderHTML: (attributes: { src?: string }) => ({
          src: resolveMediaUrl(attributes.src),
        }),
      },
      controls: {
        default: true,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(
        {
          controls: 'true',
          playsinline: 'true',
          preload: 'metadata',
          class: 'note-video rounded-xl max-w-full my-3 block border border-default shadow-xs',
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
    ]
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})
