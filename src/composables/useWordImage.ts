import { ref, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'

const cache = new Map<string, string>()

function fallbackUrl(word: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(word)}/400/300`
}

function wikiTitle(word: string): string {
  const trimmed = word.trim()
  if (!trimmed) return ''
  return trimmed
    .split(/\s+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ')
}

async function fetchWikipediaImage(word: string): Promise<string | null> {
  const title = wikiTitle(word)
  if (!title) return null
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=400&origin=*`
    const res = await fetch(url)
    const data = await res.json()
    const pages = data.query?.pages ?? {}
    const page = Object.values(pages)[0] as { thumbnail?: { source: string } } | undefined
    return page?.thumbnail?.source ?? null
  } catch {
    return null
  }
}

/**
 * Returns a ref that holds the best available image URL for the given word.
 * Fetches from Wikipedia (word-relevant image); falls back to placeholder while loading or on failure.
 */
export function useWordImage(word: Ref<string> | ComputedRef<string>) {
  const imageUrl = ref<string>('')

  async function updateImage(w: string) {
    if (!w?.trim()) {
      imageUrl.value = ''
      return
    }
    const key = w.trim().toLowerCase()
    if (cache.has(key)) {
      imageUrl.value = cache.get(key)!
      return
    }
    imageUrl.value = fallbackUrl(w)
    const wikiUrl = await fetchWikipediaImage(w)
    if (wikiUrl) {
      cache.set(key, wikiUrl)
      imageUrl.value = wikiUrl
    }
  }

  watch(word, (w) => updateImage(w ?? ''), { immediate: true })

  return imageUrl
}
