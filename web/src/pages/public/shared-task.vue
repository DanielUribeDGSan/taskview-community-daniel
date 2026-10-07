<template>
  <div class="min-h-screen bg-default">
    <header class="border-b border-default sticky top-0 z-10 bg-default/95 backdrop-blur">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-muted truncate">
            {{ payload?.goal?.name || t('tasks.share.publicBadge') }}
          </p>
          <h1 class="text-sm font-medium truncate">
            {{ t('tasks.share.publicTitle') }}
          </h1>
        </div>
        <UButton
          :to="'/'"
          color="neutral"
          variant="ghost"
          size="sm"
          :label="t('tasks.share.goHome')"
        />
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-8">
      <div
        v-if="loading"
        class="text-muted"
      >
        {{ t('common.loading') }}
      </div>

      <div
        v-else-if="error"
        class="flex flex-col items-center gap-3 py-20 text-center"
      >
        <UIcon
          name="i-lucide-link-2-off"
          class="size-12 text-muted"
        />
        <p class="text-lg font-medium">
          {{ t('tasks.share.notFound') }}
        </p>
        <p class="text-muted text-sm">
          {{ t('tasks.share.notFoundHint') }}
        </p>
      </div>

      <article
        v-else-if="payload"
        class="flex flex-col gap-6"
      >
        <div class="flex items-start gap-3">
          <UCheckbox
            :model-value="!!payload.task.complete"
            disabled
            class="mt-1.5"
          />
          <h2
            class="text-3xl font-semibold tracking-tight leading-tight"
            :class="{ 'text-muted line-through': payload.task.complete }"
          >
            {{ payload.task.description || t('tasks.share.untitled') }}
          </h2>
        </div>

        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div
            v-if="payload.status"
            class="flex gap-2"
          >
            <dt class="text-muted w-24 shrink-0">
              {{ t('tasks.status') }}
            </dt>
            <dd>{{ payload.status.name }}</dd>
          </div>
          <div
            v-if="priorityLabel"
            class="flex gap-2"
          >
            <dt class="text-muted w-24 shrink-0">
              {{ t('tasks.priority') }}
            </dt>
            <dd>{{ priorityLabel }}</dd>
          </div>
          <div
            v-if="payload.list"
            class="flex gap-2"
          >
            <dt class="text-muted w-24 shrink-0">
              {{ t('tasks.list') }}
            </dt>
            <dd>{{ payload.list.name }}</dd>
          </div>
          <div
            v-if="payload.sprint"
            class="flex gap-2"
          >
            <dt class="text-muted w-24 shrink-0">
              {{ t('tasks.fields.sprint') }}
            </dt>
            <dd>{{ payload.sprint.name }}</dd>
          </div>
          <div
            v-if="deadlineLabel"
            class="flex gap-2"
          >
            <dt class="text-muted w-24 shrink-0">
              {{ t('tasks.deadline') }}
            </dt>
            <dd>{{ deadlineLabel }}</dd>
          </div>
          <div
            v-if="payload.assignees.length"
            class="flex gap-2 sm:col-span-2"
          >
            <dt class="text-muted w-24 shrink-0">
              {{ t('tasks.assignees') }}
            </dt>
            <dd class="flex flex-wrap gap-1">
              <UBadge
                v-for="user in payload.assignees"
                :key="user.id"
                color="neutral"
                variant="subtle"
              >
                {{ user.email }}
              </UBadge>
            </dd>
          </div>
          <div
            v-if="payload.tags.length"
            class="flex gap-2 sm:col-span-2"
          >
            <dt class="text-muted w-24 shrink-0">
              {{ t('tasks.tags') }}
            </dt>
            <dd class="flex flex-wrap gap-1">
              <UBadge
                v-for="tag in payload.tags"
                :key="tag.id"
                variant="subtle"
                :style="{ backgroundColor: tag.color + '22', color: tag.color }"
              >
                {{ tag.name }}
              </UBadge>
            </dd>
          </div>
        </dl>

        <section v-if="payload.subtasks.length">
          <h3 class="text-sm font-medium mb-2">
            {{ t('tasks.subtasks') }}
          </h3>
          <ul class="flex flex-col gap-2">
            <li
              v-for="sub in payload.subtasks"
              :key="sub.id"
              class="flex items-center gap-2 text-sm"
            >
              <UCheckbox
                :model-value="!!sub.complete"
                disabled
              />
              <span :class="{ 'text-muted line-through': sub.complete }">
                {{ sub.description || t('tasks.share.untitled') }}
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="text-sm font-medium mb-2">
            {{ t('tasks.note') }}
          </h3>
          <NoteEditor
            :key="noteKey"
            :content="payload.task.note || ''"
            content-type="html"
            readonly
            allow-readonly-checklist
            force-visible
            hide-footer
            auto-grow
            @checklist-toggle="onChecklistToggle"
          />
        </section>

        <!-- Historial de cambios / Actividad -->
        <div
          v-if="payload.history?.length || payload.lastModified"
          class="flex flex-col gap-3 border border-default rounded-2xl p-3.5 dark:bg-tv-ui-bg-elevated"
          data-testid="task-history"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm font-medium">
              <UIcon
                name="i-lucide-history"
                class="size-4 text-primary"
              />
              <span>{{ t('tasks.history.title') || 'Historial de cambios' }}</span>
              <span
                v-if="payload.history?.length"
                class="text-muted font-normal text-xs"
              >({{ payload.history.length }})</span>
            </div>
            <span
              v-if="payload.lastModified"
              class="text-xs text-muted"
            >
              {{ t('tasks.history.lastChangeBy') || 'Último cambio por' }}:
              <strong class="text-default font-medium">{{ payload.lastModified.userEmail || payload.lastModified.userName || 'Usuario' }}</strong>
            </span>
          </div>

          <!-- Último cambio destacado si existe -->
          <div
            v-if="payload.lastModified"
            class="flex items-center gap-2 text-xs bg-default/40 border border-default/60 rounded-xl px-3 py-2"
          >
            <UIcon
              name="i-lucide-sparkles"
              class="size-3.5 text-primary shrink-0"
            />
            <span class="flex-1">
              <strong>{{ payload.lastModified.userEmail || payload.lastModified.userName || 'Usuario' }}</strong>:
              {{ payload.lastModified.details || getHistoryActionLabel(payload.lastModified.action || '') }}
              · <span class="text-muted">{{ formatDate(payload.lastModified.at) }}</span>
            </span>
          </div>

          <!-- Lista detallada del historial -->
          <ul
            v-if="payload.history?.length"
            class="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 mt-1"
          >
            <li
              v-for="entry in payload.history"
              :key="entry.id"
              class="flex items-start justify-between gap-3 text-xs border-b border-default/40 pb-2 last:border-b-0 last:pb-0"
            >
              <div class="flex items-start gap-2 min-w-0">
                <UIcon
                  :name="getHistoryActionIcon(entry.action)"
                  class="size-3.5 text-primary shrink-0 mt-0.5"
                />
                <div class="flex flex-col min-w-0">
                  <div class="flex items-baseline gap-1.5 flex-wrap">
                    <span class="font-medium text-default">{{ entry.userEmail || entry.userName || 'Usuario' }}</span>
                    <span class="text-muted">{{ entry.details || getHistoryActionLabel(entry.action) }}</span>
                  </div>
                </div>
              </div>
              <span class="text-muted shrink-0 text-[11px]">{{ formatDate(entry.createdAt) }}</span>
            </li>
          </ul>
        </div>

        <TaskComments
          :token="token"
          :initial-comments="payload.comments"
        />
      </article>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { PublicSharedTask } from 'taskview-api'
import { $ls, $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { usePriorityOptions } from '@/composables/usePriorityOptions'
import NoteEditor from '@/components/features/tasks/parts/NoteEditor.vue'
import TaskComments from '@/components/features/tasks/parts/TaskComments.vue'

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const { options: priorityOptions } = usePriorityOptions()

const token = computed(() => String(route.params.token || ''))
const loading = ref(true)
const error = ref(false)
const payload = ref<PublicSharedTask | null>(null)
const noteKey = ref(0)

const priorityLabel = computed(() => {
  const id = payload.value?.task.priorityId
  if (!id) return ''
  return priorityOptions.value.find(o => o.value === id)?.label ?? ''
})

const deadlineLabel = computed(() => {
  const end = payload.value?.task.endDate
  if (!end) return ''
  const time = payload.value?.task.endTime
  return time ? `${end} ${time}` : end
})

function formatDate(value: string | Date | undefined) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function getHistoryActionIcon(action: string) {
  if (action === 'image_uploaded' || action === 'video_uploaded') return 'i-lucide-image'
  if (action === 'note_updated') return 'i-lucide-file-text'
  if (action === 'title_updated') return 'i-lucide-edit-3'
  if (action === 'checklist_toggled' || action === 'complete_updated') return 'i-lucide-check-circle-2'
  if (action === 'status_updated') return 'i-lucide-columns-3'
  if (action === 'priority_updated') return 'i-lucide-flag'
  return 'i-lucide-clock'
}

function getHistoryActionLabel(action: string) {
  if (action === 'image_uploaded') return 'Subió una imagen'
  if (action === 'video_uploaded') return 'Subió un video'
  if (action === 'note_updated') return 'Modificó la nota'
  if (action === 'title_updated') return 'Modificó el título'
  if (action === 'checklist_toggled') return 'Actualizó una casilla'
  if (action === 'complete_updated') return 'Actualizó el estado de completado'
  if (action === 'status_updated') return 'Cambió de estado'
  if (action === 'priority_updated') return 'Cambió de prioridad'
  return 'Realizó un cambio'
}

async function load() {
  loading.value = true
  error.value = false
  const result = await $tvApi.tasks.fetchPublicTask(token.value).catch((err) => {
    logError(err)
    return null
  })
  loading.value = false
  if (!result) {
    error.value = true
    payload.value = null
    return
  }
  payload.value = result
}

async function onChecklistToggle({ itemIndex, checked }: { itemIndex: number; checked: boolean }) {
  const result = await $tvApi.tasks
    .togglePublicChecklist(token.value, itemIndex, checked)
    .catch(logError)
  if (!result) {
    toast.add({ title: t('tasks.share.checklistFailed'), color: 'error' })
    noteKey.value += 1
    return
  }
  if (payload.value) {
    payload.value = {
      ...payload.value,
      task: { ...payload.value.task, note: result.note },
    }
    noteKey.value += 1
    // Reload full payload to update history with new checklist event
    void load()
  }
}

onMounted(async () => {
  await $ls?.updateUserStoreByToken().catch(() => null)
  void load()
})
</script>
