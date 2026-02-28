import { defineStore } from 'pinia'
import type { TopicData, VocabItem } from '@/types/vocab'
import { getTopicData } from '@/data/topics'

export const useVocabStore = defineStore('vocab', {
  state: () => ({
    currentTopicId: null as string | null,
    currentIndex: 0,
  }),

  getters: {
    currentTopicData(state): TopicData | undefined {
      return state.currentTopicId ? getTopicData(state.currentTopicId) : undefined
    },
    currentVocabs(state): VocabItem[] {
      const topic = state.currentTopicId ? getTopicData(state.currentTopicId) : undefined
      return topic?.vocabs ?? []
    },
    currentWord(state): VocabItem | undefined {
      const vocabs = this.currentVocabs
      return vocabs[state.currentIndex]
    },
    hasNext(state): boolean {
      return state.currentIndex < this.currentVocabs.length - 1
    },
    hasPrev(state): boolean {
      return state.currentIndex > 0
    },
    progress(state): { current: number; total: number } {
      const total = this.currentVocabs.length
      return { current: Math.min(state.currentIndex + 1, total) || 0, total }
    },
  },

  actions: {
    setTopic(topicId: string) {
      this.currentTopicId = topicId
      this.currentIndex = 0
    },
    nextWord() {
      if (this.hasNext) this.currentIndex++
    },
    prevWord() {
      if (this.hasPrev) this.currentIndex--
    },
    goToIndex(index: number) {
      const total = this.currentVocabs.length
      this.currentIndex = Math.max(0, Math.min(index, total - 1))
    },
    reset() {
      this.currentTopicId = null
      this.currentIndex = 0
    },
  },
})
