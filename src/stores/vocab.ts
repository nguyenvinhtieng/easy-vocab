import { defineStore } from 'pinia'
import type { TopicData, VocabItem } from '@/types/vocab'
import { getTopicData } from '@/data/topics'
import { useLearnStore } from './learn'
import { useKnownStore } from './known'

export const useVocabStore = defineStore('vocab', {
  state: () => ({
    currentTopicId: null as string | null,
    currentIndex: 0,
    /** When set, flashcard uses this list instead of full topic vocabs (e.g. "only new words"). */
    customVocabs: null as VocabItem[] | null,
  }),

  getters: {
    currentTopicData(state): TopicData | undefined {
      return state.currentTopicId ? getTopicData(state.currentTopicId) : undefined
    },
    currentVocabs(state): VocabItem[] {
      if (state.customVocabs != null) return state.customVocabs
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
      this.customVocabs = null
      this.currentIndex = 0
    },
    /** Filter to words not in known or learn list for current topic. Call after setTopic. */
    setFilterOnlyNew(onlyNew: boolean) {
      if (!this.currentTopicId) return
      const topic = getTopicData(this.currentTopicId)
      const full = topic?.vocabs ?? []
      if (onlyNew) {
        const learn = useLearnStore()
        const known = useKnownStore()
        this.customVocabs = full.filter(
          (w) =>
            !learn.hasItem(this.currentTopicId!, w.word) &&
            !known.hasKnown(this.currentTopicId!, w.word)
        )
      } else {
        this.customVocabs = null
      }
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
