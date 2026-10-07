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

        <TaskComments
          :token="token"
          :initial-comments="payload.comments"
          ask-name
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
import { $tvApi } from '@/plugins/axios'
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
  }
}

onMounted(() => {
  void load()
})
</script>
