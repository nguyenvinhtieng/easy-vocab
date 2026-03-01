/**
 * Load vocab types (e.g. "1000 từ thông dụng") and their topics from data subfolders.
 * Each subfolder under data/ is a type; each *.json in it is a topic (except _meta.json).
 * Learn/known lists are global (not split by type).
 */
import type { TopicData, VocabItem } from '@/types/vocab'

// All topic JSONs: ./typeId/topicSlug.json
const topicModules = import.meta.glob<{ default: TopicData }>('./*/*.json', { eager: true })
// Optional type display name: ./typeId/_meta.json
const metaModules = import.meta.glob<{ default: { name: string } }>('./*/_meta.json', { eager: true })

export interface VocabType {
  id: string
  name: string
}

export interface TopicMeta {
  id: string
  name: string
  typeId: string
  /** Full key for getTopicData and learn/known: typeId/topicSlug */
  topicKey: string
}

const typeMap = new Map<string, VocabType>()
const topicByKey = new Map<string, TopicData>()
const topicsByType = new Map<string, TopicMeta[]>()

function humanize(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Collect type ids from topic paths and load type names from _meta if present
for (const path of Object.keys(topicModules)) {
  const m = path.match(/^\.\/([^/]+)\/(.+)\.json$/)
  const typeId = m?.[1]
  const topicSlug = m?.[2]
  if (!typeId || !topicSlug) continue
  if (topicSlug === '_meta') continue
  if (!typeMap.has(typeId)) {
    const metaPath = `./${typeId}/_meta.json`
    const meta = metaModules[metaPath] as { default?: { name: string } } | undefined
    const name = meta?.default?.name ?? humanize(typeId)
    typeMap.set(typeId, { id: typeId, name })
  }
}

// Load topic data and build topic list per type
for (const [path, mod] of Object.entries(topicModules)) {
  const m = path.match(/^\.\/([^/]+)\/(.+)\.json$/)
  const typeId = m?.[1]
  const topicSlug = m?.[2]
  if (!typeId || !topicSlug) continue
  if (topicSlug === '_meta') continue
  const data = mod?.default ?? (mod as unknown as TopicData)
  if (!data?.topic || !Array.isArray(data?.vocabs)) continue
  const topicKey = `${typeId}/${topicSlug}`
  topicByKey.set(topicKey, data)
  const list = topicsByType.get(typeId) ?? []
  list.push({
    id: topicSlug,
    name: data.topic,
    typeId,
    topicKey,
  })
  topicsByType.set(typeId, list)
}

export function getTypeList(): VocabType[] {
  return Array.from(typeMap.values())
}

/** All topics, optionally filtered by typeId. */
export function getTopicList(typeId?: string): TopicMeta[] {
  if (typeId) {
    return topicsByType.get(typeId) ?? []
  }
  return Array.from(topicsByType.values()).flat()
}

export function getTopicData(topicKey: string): TopicData | undefined {
  return topicByKey.get(topicKey)
}

export function getVocabByWord(topicKey: string, word: string): VocabItem | undefined {
  const topic = topicByKey.get(topicKey)
  if (!topic) return undefined
  return topic.vocabs.find((v) => v.word.trim().toLowerCase() === word.trim().toLowerCase())
}
