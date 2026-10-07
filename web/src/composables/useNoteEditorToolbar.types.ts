import type { Ref } from 'vue'

export type UseNoteEditorToolbarArgs = {
  isFullscreen: Ref<boolean>
  onToggleFullscreen: () => void
  onSetHighlight?: (color: string) => void
  onUnsetHighlight?: () => void
  onTriggerMediaUpload?: () => void
}
