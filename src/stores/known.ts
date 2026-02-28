import { defineStore } from 'pinia'
import type { KnownItem } from '@/types/vocab'
import { getTopicList } from '@/data/topics'

const STORAGE_KEY = 'easy-vocab-words-known'

function loadFromStorage(): KnownItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const topics = getTopicList()
    return parsed
      .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object' && 'word' in i && typeof (i as { word: unknown }).word === 'string')
      .map((i) => {
        const word = String((i as { word: string }).word).trim()
        let topicId: string
        if ('topicId' in i && typeof (i as { topicId: unknown }).topicId === 'string') {
          topicId = (i as { topicId: string }).topicId
        } else if ('topic' in i && typeof (i as { topic: unknown }).topic === 'string') {
          const name = (i as { topic: string }).topic
          topicId = topics.find((t) => t.name === name)?.id ?? name
        } else {
          topicId = 'imported'
        }
        const addedAt = typeof (i as { addedAt?: string }).addedAt === 'string' ? (i as { addedAt: string }).addedAt : new Date().toISOString()
        return { topicId, word, addedAt }
      })
  } catch {
    return []
  }
}

function saveToStorage(items: KnownItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useKnownStore = defineStore('known', {
  state: () => ({
    items: loadFromStorage() as KnownItem[],
  }),

  getters: {
    count: (state) => state.items.length,
    all: (state) => state.items,
    hasKnown: (state) => (topicId: string, word: string) =>
      state.items.some(
        (i) => i.topicId === topicId && i.word.trim().toLowerCase() === word.trim().toLowerCase()
      ),
  },

  actions: {
    add(topicId: string, word: string) {
      if (this.hasKnown(topicId, word)) return
      const item: KnownItem = {
        topicId,
        word: word.trim(),
        addedAt: new Date().toISOString(),
      }
      this.items = [...this.items, item]
      saveToStorage(this.items)
    },
    replaceAll(items: KnownItem[]) {
      const valid = Array.isArray(items)
        ? items.filter(
            (i) => i && typeof i === 'object' && typeof i.topicId === 'string' && typeof i.word === 'string'
          )
        : []
      this.items = valid.map((i) => ({
        topicId: i.topicId,
        word: i.word.trim(),
        addedAt: i.addedAt ?? new Date().toISOString(),
      }))
      saveToStorage(this.items)
    },
  },
})
