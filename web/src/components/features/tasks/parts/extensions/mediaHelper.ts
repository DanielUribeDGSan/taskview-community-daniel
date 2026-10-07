import { getConfiguredApiUrl } from '@/helpers/serverConfig'

/**
 * Resolves a media URL (image, gif, video).
 * If the URL is relative (e.g. /module/tasks/media/xxx), it prefixes the configured API URL
 * when running against a separate backend host/port.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  const apiBase = getConfiguredApiUrl()
  if (apiBase && url.startsWith('/')) {
    return `${apiBase.replace(/\/+$/, '')}${url}`
  }
  return url
}
