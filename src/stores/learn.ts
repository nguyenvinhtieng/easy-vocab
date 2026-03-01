import { defineStore } from 'pinia'
import type { LearnItem } from '@/types/vocab'
import { getTopicList } from '@/data/topics'

const STORAGE_KEY = 'easy-vocab-words-to-learn'

function loadFromStorage(): LearnItem[] {
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
          topicId = topics.find((t) => t.name === name)?.topicKey ?? name
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

function saveToStorage(items: LearnItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useLearnStore = defineStore('learn', {
  state: () => ({
    items: loadFromStorage() as LearnItem[],
  }),

  getters: {
    count: (state) => state.items.length,
    all: (state) => state.items,
    hasItem: (state) => (topicId: string, word: string) =>
      state.items.some(
        (i) => i.topicId === topicId && i.word.trim().toLowerCase() === word.trim().toLowerCase()
      ),
  },

  actions: {
    add(topicId: string, word: string) {
      if (this.hasItem(topicId, word)) return
      const item: LearnItem = {
        topicId,
        word: word.trim(),
        addedAt: new Date().toISOString(),
      }
      this.items = [...this.items, item]
      saveToStorage(this.items)
    },
    remove(topicId: string, word: string) {
      this.items = this.items.filter(
        (i) => !(i.topicId === topicId && i.word.trim().toLowerCase() === word.trim().toLowerCase())
      )
      saveToStorage(this.items)
    },
    clear() {
      this.items = []
      saveToStorage(this.items)
    },
    replaceAll(items: LearnItem[]) {
      const valid = Array.isArray(items)
        ? items.filter(
            (i) => i && typeof i === 'object' && typeof i.topicId === 'string' && typeof i.word === 'string'
          )
        : []
      this.items = valid.map((i) => ({
        topicId: i.topicId,
        word: i.word.trim(),
        addedAt: (i as LearnItem).addedAt ?? new Date().toISOString(),
      }))
      saveToStorage(this.items)
    },
    exportToJson(): string {
      return JSON.stringify(this.items, null, 2)
    },
    importFromJson(json: string): { ok: boolean; count: number; error?: string } {
      try {
        const parsed = JSON.parse(json) as unknown
        const list = Array.isArray(parsed) ? parsed : []
        const topics = getTopicList()
        const valid: LearnItem[] = []
        for (const i of list) {
          if (!i || typeof i !== 'object' || !('word' in i) || typeof (i as { word: unknown }).word !== 'string')
            continue
          const w = ((i as { word: string }).word || '').trim()
          if (!w) continue
          let topicId: string
          if ('topicId' in i && typeof (i as { topicId: unknown }).topicId === 'string') {
            topicId = (i as { topicId: string }).topicId
          } else if ('topic' in i && typeof (i as { topic: unknown }).topic === 'string') {
            const name = (i as { topic: string }).topic
            const found = topics.find((t) => t.name === name)
            topicId = found?.topicKey ?? name
          } else {
            topicId = 'imported'
          }
          if (this.hasItem(topicId, w)) continue
          valid.push({
            topicId,
            word: w,
            addedAt: (i as LearnItem).addedAt ?? new Date().toISOString(),
          })
        }
        this.items = [...this.items, ...valid]
        saveToStorage(this.items)
        return { ok: true, count: valid.length }
      } catch (e) {
        return { ok: false, count: 0, error: (e as Error).message }
      }
    },
  },
})
