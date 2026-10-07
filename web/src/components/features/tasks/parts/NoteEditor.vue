<template>
  <div>
    <Teleport
      :to="fullscreenTarget"
      :disabled="!isTeleported"
    >
      <div
        class="note-editor relative overflow-clip dark:bg-tv-ui-bg-elevated!"
        :class="[
          isFullscreen ? 'flex flex-col flex-1 min-h-0' : 'border border-default rounded-2xl',
          isDraggingOver ? 'is-drag-over' : '',
        ]"
        data-testid="task-note-editor"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @paste="onPaste"
      >
        <!-- Drag & Drop visual overlay -->
        <div
          v-if="isDraggingOver"
          class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-primary-500/10 dark:bg-primary-500/15 backdrop-blur-xs rounded-2xl border-2 border-dashed border-primary-500 transition-all"
        >
          <div class="flex items-center gap-2 bg-default px-4 py-2 rounded-xl shadow-lg border border-default text-sm font-medium">
            <UIcon
              name="i-lucide-upload-cloud"
              class="size-5 text-primary"
            />
            <span>{{ t('tasks.noteDropMedia') || 'Suelta aquí imágenes, GIFs o videos (máx 40MB)' }}</span>
          </div>
        </div>

        <!-- Hidden file input for toolbar button -->
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*,video/*"
          class="hidden"
          @change="onFileInputChange"
        >

        <UEditor
          v-if="showEditor"
          ref="editorRef"
          #default="{ editor }"
          v-model="editorContent"
          :content-type="contentType"
          :placeholder="placeholder"
          :extensions="extensions"
          :editable="isEditable"
          :class="isFullscreen ? 'flex flex-col flex-1 min-h-0' : 'min-h-32'"
          :ui="{ content: contentClass }"
          @update:model-value="handleUpdate"
        >
          <UEditorToolbar
            v-if="isEditable"
            :editor="editor"
            :items="toolbarItems"
            class="sticky -top-5 z-10 border-b border-default overflow-x-auto shrink-0 bg-default dark:bg-tv-ui-bg-elevated"
            :ui="{ base: 'p-2' }"
          />
        </UEditor>
        <NoteEditorFooter
          v-if="isOverflowing && !hideFooter"
          :expanded="isExpanded"
          @toggle-expand="toggleExpanded"
          @fullscreen="toggleFullscreen"
        />
      </div>
    </Teleport>

    <UModal
      v-model:open="isFullscreen"
      fullscreen
      :title="t('tasks.note')"
      :ui="{ body: 'p-0! flex flex-col min-h-0' }"
      data-testid="task-note-fullscreen"
      @after:leave="focusEditor"
    >
      <template #body>
        <div
          ref="fullscreenTarget"
          class="flex flex-col flex-1 min-h-0"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { $tvApi } from '@/plugins/axios'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useNoteEditorToolbar } from '@/composables/useNoteEditorToolbar'
import { useNoteEditorCollapse } from '@/composables/useNoteEditorCollapse'
import NoteEditorFooter from '@/components/features/tasks/parts/NoteEditorFooter.vue'
import { CustomHighlight } from './extensions/CustomHighlight'
import { CustomImage } from './extensions/CustomImage'
import { Video } from './extensions/Video'

const { t } = useI18n()
const toast = useToast()
const taskApi = $tvApi.tasks

const {
  canEditTaskNote,
  canViewTaskNote,
} = useGoalPermissions()

const props = withDefaults(defineProps<{
  content: string
  contentType?: 'html' | 'markdown'
  placeholder?: string
  debounce?: number
  /** Force read-only (public share page) */
  readonly?: boolean
  /** Allow toggling checklist boxes while read-only */
  allowReadonlyChecklist?: boolean
  hideFooter?: boolean
  forceVisible?: boolean
}>(), {
  contentType: 'html',
  debounce: 500,
  readonly: false,
  allowReadonlyChecklist: false,
  hideFooter: false,
  forceVisible: false,
})

const emit = defineEmits<{
  (e: 'save', value: string): void
  (e: 'checklistToggle', payload: { itemIndex: number; checked: boolean }): void
}>()

const editorRef = useTemplateRef('editorRef')
const fullscreenTarget = useTemplateRef<HTMLElement>('fullscreenTarget')
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')

const isEditable = computed(() => !props.readonly && canEditTaskNote.value)
const showEditor = computed(() => props.forceVisible || canViewTaskNote.value || props.readonly)

function findTaskItemIndex(doc: ProseMirrorNode, target: ProseMirrorNode) {
  let index = -1
  let found = -1
  doc.descendants((node) => {
    if (node.type.name !== 'taskItem') return
    index += 1
    if (node === target || node.eq(target)) {
      found = index
      return false
    }
  })
  return found
}

const extensions = [
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
    onReadOnlyChecked: (node, checked) => {
      if (!props.allowReadonlyChecklist) return false
      const editor = editorRef.value?.editor
      if (!editor) return false
      const itemIndex = findTaskItemIndex(editor.state.doc, node)
      if (itemIndex < 0) return false
      emit('checklistToggle', { itemIndex, checked })
      return true
    },
  }),
  CustomHighlight.configure({
    multicolor: true,
  }),
  CustomImage.configure({
    inline: false,
    allowBase64: true,
  }),
  Video,
]

const editorContent = ref(props.content)

watch(() => props.content, (next) => {
  if (next !== editorContent.value) {
    editorContent.value = next
  }
})

const debouncedSave = useDebounceFn((value: string) => {
  emit('save', value)
}, props.debounce)

function handleUpdate(value: string) {
  editorContent.value = value
  if (isEditable.value) {
    debouncedSave(value)
  }
}

const isFullscreen = ref(false)
const isTeleported = computed(() => isFullscreen.value && !!fullscreenTarget.value)

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

function setHighlight(color: string) {
  editorRef.value?.editor?.chain().focus().toggleHighlight({ color }).run()
}

function unsetHighlight() {
  editorRef.value?.editor?.chain().focus().unsetHighlight().run()
}

function triggerMediaUpload() {
  fileInputRef.value?.click()
}

const { toolbarItems } = useNoteEditorToolbar({
  isFullscreen,
  onToggleFullscreen: toggleFullscreen,
  onSetHighlight: setHighlight,
  onUnsetHighlight: unsetHighlight,
  onTriggerMediaUpload: triggerMediaUpload,
})

const contentElement = computed(() => editorRef.value?.editor?.view.dom ?? null)

const { isOverflowing, isCollapsed, isExpanded, toggleExpanded } = useNoteEditorCollapse({
  contentElement,
  isFullscreen,
})

const contentClass = computed(() => {
  if (isFullscreen.value) return 'flex-1 min-h-0 overflow-y-auto'
  if (isCollapsed.value) return 'max-h-80 overflow-y-auto'
  return ''
})

async function focusEditor() {
  await nextTick()
  editorRef.value?.editor?.commands.focus()
}

watch(isTeleported, (teleported) => {
  if (teleported) focusEditor()
})

/* ==========================================================================
   Media Upload, Drag & Drop, and Paste Handling
   ========================================================================== */

const MAX_FILE_SIZE = 40 * 1024 * 1024 // 40 MB
const isDraggingOver = ref(false)

function onDragOver(e: DragEvent) {
  if (!isEditable.value) return
  if (e.dataTransfer?.types?.includes('Files')) {
    e.preventDefault()
    isDraggingOver.value = true
  }
}

function onDragLeave(e: DragEvent) {
  if (!isEditable.value) return
  // If leaving the element entirely
  if ((e.currentTarget as HTMLElement)?.contains(e.relatedTarget as Node)) return
  isDraggingOver.value = false
}

async function onDrop(e: DragEvent) {
  if (!isEditable.value) return
  isDraggingOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    e.preventDefault()
    e.stopPropagation()
    for (let i = 0; i < files.length; i++) {
      await processAndInsertFile(files[i])
    }
  }
}

async function onPaste(e: ClipboardEvent) {
  if (!isEditable.value) return
  const files = e.clipboardData?.files
  if (files && files.length > 0) {
    let hasMedia = false
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        hasMedia = true
        await processAndInsertFile(file)
      }
    }
    if (hasMedia) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
}

async function onFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      await processAndInsertFile(files[i])
    }
    target.value = ''
  }
}

async function processAndInsertFile(file: File) {
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (!isImage && !isVideo) {
    toast.add({
      title: 'Tipo de archivo no compatible',
      description: 'Solo se permiten imágenes (PNG, JPG, GIF, WebP, SVG) y videos.',
      color: 'warning',
    })
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    toast.add({
      title: 'Archivo demasiado grande',
      description: `El archivo "${file.name}" supera el límite máximo de 40 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
      color: 'error',
    })
    return
  }

  toast.add({
    title: 'Subiendo archivo...',
    description: file.name,
    color: 'neutral',
  })

  try {
    const media = await taskApi.uploadMedia(file)
    if (!media?.url) {
      throw new Error('Respuesta inválida del servidor')
    }

    const editor = editorRef.value?.editor
    if (!editor) return

    if (media.type === 'video' || isVideo) {
      editor.chain().focus().setVideo({ src: media.url }).run()
    } else {
      editor.chain().focus().setImage({ src: media.url, alt: file.name }).run()
    }

    toast.add({
      title: 'Archivo insertado',
      description: file.name,
      color: 'success',
    })
  } catch (err: any) {
    // If backend upload fails, fallback for small images to base64
    if (isImage && file.size < 5 * 1024 * 1024) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          editorRef.value?.editor?.chain().focus().setImage({ src: reader.result, alt: file.name }).run()
        }
      }
      reader.readAsDataURL(file)
      toast.add({
        title: 'Imagen insertada localmente',
        description: file.name,
        color: 'neutral',
      })
    } else {
      toast.add({
        title: 'Error al subir',
        description: err?.response?.data?.message || err?.message || 'No se pudo subir el archivo.',
        color: 'error',
      })
    }
  }
}
</script>

<style scoped>
.note-editor {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.note-editor.is-drag-over {
  border-color: var(--color-primary, #10b981) !important;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
}

.note-editor :deep(.tiptap) {
  padding: 0.75rem;
  padding-left: 2rem;
  outline: none;
}

.note-editor :deep(.tiptap li) {
  margin-top: 2px;
  margin-bottom: 2px;
}

.note-editor :deep(.tiptap > p) {
  margin-bottom: 16px;
  line-height: 24px;
}

.note-editor :deep(.tiptap > * + *) {
  margin-top: 16px;
  margin-bottom: 16px;
  line-height: 24px;
}

.note-editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  color: var(--color-text-muted);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

/* Checklist styles */
.note-editor :deep(ul[data-type='taskList']) {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.note-editor :deep(ul[data-type='taskList'] li[data-type='taskItem']) {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.note-editor :deep(ul[data-type='taskList'] li[data-type='taskItem'] > label) {
  margin-top: 0.2rem;
  flex-shrink: 0;
}

.note-editor :deep(ul[data-type='taskList'] li[data-type='taskItem'] > div) {
  flex: 1;
  min-width: 0;
}

.note-editor :deep(ul[data-type='taskList'] li[data-checked='true'] > div) {
  opacity: 0.65;
  text-decoration: line-through;
}

/* Highlight / Subrayado de color */
.note-editor :deep(mark) {
  border-radius: 0.25rem;
  padding: 0.125rem 0.25rem;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  color: #0f172a !important; /* Asegura excelente contraste en tema claro u oscuro */
  font-weight: 500;
}

/* Imagen y GIFs */
.note-editor :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
  margin: 0.75rem 0;
  display: block;
  border: 1px solid rgba(120, 120, 120, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Videos */
.note-editor :deep(video) {
  max-width: 100%;
  width: 100%;
  max-height: 480px;
  border-radius: 0.75rem;
  margin: 0.75rem 0;
  display: block;
  border: 1px solid rgba(120, 120, 120, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background-color: #000;
}
</style>
