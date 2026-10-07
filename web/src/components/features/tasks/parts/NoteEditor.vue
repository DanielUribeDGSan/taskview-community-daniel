<template>
  <div>
    <Teleport
      :to="fullscreenTarget"
      :disabled="!isTeleported"
    >
      <div
        class="note-editor overflow-clip dark:bg-tv-ui-bg-elevated!"
        :class="isFullscreen ? 'flex flex-col flex-1 min-h-0' : 'border border-default rounded-2xl'"
        data-testid="task-note-editor"
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
            :ui="{base: 'p-2'}"
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
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useNoteEditorToolbar } from '@/composables/useNoteEditorToolbar'
import { useNoteEditorCollapse } from '@/composables/useNoteEditorCollapse'
import NoteEditorFooter from '@/components/features/tasks/parts/NoteEditorFooter.vue'

const { t } = useI18n()

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
  save: [value: string]
  checklistToggle: [payload: { itemIndex: number; checked: boolean }]
}>()

const editorRef = useTemplateRef('editorRef')
const fullscreenTarget = useTemplateRef<HTMLElement>('fullscreenTarget')

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

const { toolbarItems } = useNoteEditorToolbar({
  isFullscreen,
  onToggleFullscreen: toggleFullscreen,
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
</script>

<style scoped>
.note-editor :deep(.tiptap) {
  padding: 0.75rem;
  padding-left: 2rem;
  outline: none;
}

.note-editor :deep(.tiptap li){
  margin-top: 2px;
  margin-bottom: 2px;
}

.note-editor :deep(.tiptap > p){
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
</style>
