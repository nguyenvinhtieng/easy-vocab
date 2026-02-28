export interface VocabItem {
  word: string
  partOfSpeech: string | string[]
  phonetic: string
  meaning: string
  exampleSentences?: string[]
}

export interface TopicData {
  topic: string
  vocabs: VocabItem[]
}

/** Stored in localStorage: only topic id and word to keep data small. */
export interface LearnItem {
  topicId: string
  word: string
  addedAt: string
}

/** Words the user already knows (same shape for small storage). */
export interface KnownItem {
  topicId: string
  word: string
  addedAt?: string
}
