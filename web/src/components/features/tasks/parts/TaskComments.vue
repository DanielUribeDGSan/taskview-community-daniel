<template>
  <div
    class="flex flex-col gap-3 border border-default rounded-2xl p-3 dark:bg-tv-ui-bg-elevated"
    data-testid="task-comments"
  >
    <div class="flex items-center gap-2 text-sm font-medium">
      <UIcon
        name="i-lucide-message-square"
        class="size-4"
      />
      <span>{{ t('tasks.comments.title') }}</span>
      <span
        v-if="comments.length"
        class="text-muted font-normal"
      >({{ comments.length }})</span>
    </div>

    <div
      v-if="loading"
      class="text-sm text-muted"
    >
      {{ t('common.loading') }}
    </div>

    <div
      v-else-if="!comments.length"
      class="text-sm text-muted"
    >
      {{ t('tasks.comments.empty') }}
    </div>

    <ul
      v-else
      class="flex flex-col gap-3 max-h-64 overflow-y-auto"
    >
      <li
        v-for="comment in comments"
        :key="comment.id"
        class="text-sm"
      >
        <div class="flex items-baseline gap-2">
          <span class="font-medium">{{ comment.authorName }}</span>
          <span class="text-xs text-muted">{{ formatDate(comment.createdAt) }}</span>
        </div>
        <p class="whitespace-pre-wrap mt-0.5">
          {{ comment.body }}
        </p>
      </li>
    </ul>

    <form
      class="flex flex-col gap-2"
      @submit.prevent="submit"
    >
      <UInput
        v-if="askName"
        v-model="authorName"
        :placeholder="t('tasks.comments.namePlaceholder')"
        data-testid="task-comment-name"
      />
      <div class="flex gap-2">
        <UTextarea
          v-model="body"
          :placeholder="t('tasks.comments.placeholder')"
          :rows="2"
          class="flex-1"
          data-testid="task-comment-body"
          :ui="{ base: 'rounded-xl' }"
        />
        <UButton
          type="submit"
          icon="i-lucide-send"
          color="primary"
          :disabled="!canSubmit || sending"
          :loading="sending"
          data-testid="task-comment-submit"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskComment } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { useUserStore } from '@/stores/user.store'

const GUEST_NAME_KEY = 'tv_share_guest_name'

const props = defineProps<{
  taskId?: number
  token?: string
  askName?: boolean
  initialComments?: TaskComment[]
}>()

const emit = defineEmits<{
  updated: [comments: TaskComment[]]
}>()

const { t } = useI18n()
const userStore = useUserStore()
const toast = useToast()

const comments = ref<TaskComment[]>(props.initialComments ?? [])
const body = ref('')
const authorName = ref('')
const loading = ref(false)
const sending = ref(false)

const askName = computed(() => props.askName ?? !userStore.isLoggedIn)

const canSubmit = computed(() => {
  const hasBody = body.value.trim().length > 0
  if (!askName.value) return hasBody
  return hasBody && authorName.value.trim().length > 0
})

function formatDate(value: string | Date) {
  try {
    return new Date(value).toLocaleString()
  }
  catch {
    return String(value)
  }
}

async function load() {
  if (props.token) {
    comments.value = props.initialComments ?? comments.value
    return
  }
  if (!props.taskId) return
  loading.value = true
  const result = await $tvApi.tasks.fetchComments(props.taskId).catch(logError)
  loading.value = false
  if (result) {
    comments.value = result.comments
    emit('updated', comments.value)
  }
}

async function submit() {
  if (!canSubmit.value) return
  const text = body.value.trim()
  const name = askName.value
    ? authorName.value.trim()
    : (userStore.login || userStore.email || 'User')

  sending.value = true
  let result: { comment: TaskComment } | null | undefined
  try {
    if (props.token) {
      result = await $tvApi.tasks.addPublicComment(props.token, text, name)
    }
    else if (props.taskId) {
      result = await $tvApi.tasks.addComment(props.taskId, text, name)
    }
  }
  catch (err) {
    logError(err)
  }
  sending.value = false

  if (!result?.comment) {
    toast.add({ title: t('tasks.comments.sendFailed'), color: 'error' })
    return
  }

  comments.value = [...comments.value, result.comment]
  body.value = ''
  if (askName.value) {
    localStorage.setItem(GUEST_NAME_KEY, name)
  }
  emit('updated', comments.value)
  toast.add({ title: t('tasks.comments.sent'), color: 'success' })
}

watch(() => props.taskId, () => {
  comments.value = []
  void load()
})

watch(() => props.initialComments, (next) => {
  if (next) comments.value = next
})

onMounted(() => {
  if (askName.value) {
    authorName.value = localStorage.getItem(GUEST_NAME_KEY) ?? ''
  }
  void load()
})
</script>
