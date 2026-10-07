<template>
  <UDropdownMenu
    :items="menuItems"
    :ui="{ content: 'z-50' }"
    size="sm"
  >
    <UButton
      icon="i-lucide-share-2"
      color="neutral"
      variant="ghost"
      size="sm"
      :loading="busy"
      data-testid="task-share-button"
      :aria-label="t('tasks.share.title')"
      @click="onShareClick"
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DropdownMenuItem } from '@nuxt/ui'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'

const props = defineProps<{
  taskId: number
}>()

const { t } = useI18n()
const toast = useToast()
const busy = ref(false)
const shareUrl = ref<string | null>(null)
let copiedOnce = false

const ui = {
  itemLeadingIcon: 'size-4',
  item: 'items-center',
} as DropdownMenuItem['ui']

async function ensureShare() {
  busy.value = true
  const result = await $tvApi.tasks.createShare(props.taskId).catch(logError)
  busy.value = false
  if (!result?.url) {
    toast.add({ title: t('tasks.share.failed'), color: 'error' })
    return null
  }
  shareUrl.value = result.url
  return result.url
}

async function copyLink(silent = false) {
  const url = shareUrl.value ?? await ensureShare()
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    if (!silent) {
      toast.add({ title: t('tasks.share.copied'), color: 'success' })
    }
  }
  catch {
    toast.add({ title: t('tasks.share.copyFailed'), color: 'error' })
  }
}

async function onShareClick() {
  if (copiedOnce) return
  copiedOnce = true
  await copyLink()
}

async function openLink() {
  const url = shareUrl.value ?? await ensureShare()
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function revoke() {
  busy.value = true
  const result = await $tvApi.tasks.revokeShare(props.taskId).catch(logError)
  busy.value = false
  if (!result?.revoked) {
    toast.add({ title: t('tasks.share.revokeFailed'), color: 'error' })
    return
  }
  shareUrl.value = null
  toast.add({ title: t('tasks.share.revoked'), color: 'success' })
}

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('tasks.share.copy'),
      icon: 'i-lucide-copy',
      ui,
      'data-testid': 'task-share-copy',
      onSelect: () => { void copyLink() },
    },
    {
      label: t('tasks.share.open'),
      icon: 'i-lucide-external-link',
      ui,
      'data-testid': 'task-share-open',
      onSelect: () => { void openLink() },
    },
    {
      label: t('tasks.share.revoke'),
      icon: 'i-lucide-link-2-off',
      color: 'error' as const,
      ui,
      'data-testid': 'task-share-revoke',
      onSelect: () => { void revoke() },
    },
  ],
])
</script>
