/**
 * Load all JSON files from the data folder using Vite's import.meta.glob.
 * Each key is the file path; we derive topic id from filename (e.g. animals.json -> animals).
 */
type TopicData = import('../types/vocab').TopicData
const modules = import.meta.glob<TopicData>('./*.json', { eager: true })

export interface TopicMeta {
  id: string
  name: string
}

const topicDataMap = new Map<string, TopicData>()
const topicList: TopicMeta[] = []

for (const [path, mod] of Object.entries(modules)) {
  const data = mod && typeof mod === 'object' && 'default' in mod ? (mod as { default: TopicData }).default : (mod as TopicData)
  const id = path.split('/').pop()?.replace(/\.json$/, '') ?? ''
  if (data?.topic && Array.isArray(data?.vocabs)) {
    topicDataMap.set(id, data)
    topicList.push({ id, name: data.topic })
  }
}

export function getTopicList(): TopicMeta[] {
  return topicList
}

export function getTopicData(topicId: string): import('../types/vocab').TopicData | undefined {
  return topicDataMap.get(topicId)
}

/** Get a single vocab by word from a topic (for learn list display). */
export function getVocabByWord(topicId: string, word: string): import('../types/vocab').VocabItem | undefined {
  const topic = topicDataMap.get(topicId)
  if (!topic) return undefined
  return topic.vocabs.find((v) => v.word.trim().toLowerCase() === word.trim().toLowerCase())
}
