<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getTopicList, getTopicData } from '@/data/topics'
import { useLearnStore } from '@/stores/learn'
import { useKnownStore } from '@/stores/known'

const router = useRouter()
const learnStore = useLearnStore()
const knownStore = useKnownStore()

const topics = computed(() => getTopicList())
const learnCount = computed(() => learnStore.count)
const knownCount = computed(() => knownStore.count)

function topicTotal(topicId: string): number {
  return getTopicData(topicId)?.vocabs.length ?? 0
}

function topicKnownCount(topicId: string): number {
  return knownStore.all.filter((i) => i.topicId === topicId).length
}

function isTopicFullyKnown(topicId: string): boolean {
  const data = getTopicData(topicId)
  if (!data?.vocabs.length) return false
  return data.vocabs.every((v) => knownStore.hasKnown(topicId, v.word))
}

function startTopic(id: string) {
  router.push({ name: 'flashcard', params: { topicId: id } })
}

function goReview() {
  router.push({ name: 'review' })
}
</script>

<template>
  <div class="min-h-screen p-6 bg-gradient-to-br from-amber-50 via-orange-50/80 to-orange-100">
    <header class="text-center mb-8">
      <h1 class="text-2xl sm:text-4xl text-orange-600 font-bold m-0 mb-1">Easy Vocab</h1>
      <p class="text-amber-800 m-0 mb-2 text-base">Choose a topic to start learning</p>
      <p class="text-sm text-gray-600 m-0 mb-4">
        <span class="font-medium text-blue-600">{{ knownCount }} known</span>
        <span class="mx-1">·</span>
        <span class="font-medium text-amber-700">{{ learnCount }} to learn</span>
      </p>
      <div class="mt-3">
        <button
          v-if="learnCount > 0"
          type="button"
          class="px-5 py-2.5 rounded-full font-semibold text-sm border-0 bg-gradient-to-br from-amber-400 to-amber-500 text-gray-900 shadow-md cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]"
          @click="goReview"
        >
          📚 Review words to learn ({{ learnCount }})
        </button>
      </div>
    </header>

    <main class="max-w-[42rem] mx-auto">
      <ul class="list-none p-0 m-0 grid gap-4">
        <li
          v-for="t in topics"
          :key="t.id"
          class="flex items-center justify-between py-4 px-6 rounded-2xl shadow-md cursor-pointer transition-all border-2"
          :class="isTopicFullyKnown(t.id)
            ? 'bg-blue-100 border-blue-300 hover:bg-blue-200 hover:border-blue-400'
            : 'bg-white border-transparent hover:-translate-y-0.5 hover:shadow-lg hover:border-amber-300'"
          @click="startTopic(t.id)"
        >
          <div class="min-w-0">
            <span class="text-lg font-semibold text-gray-800">{{ t.name }} ({{ topicTotal(t.id) }})</span>
            <p class="m-0 mt-1 text-sm text-gray-500">
              <span class="text-blue-600">{{ topicKnownCount(t.id) }} known</span>
              <span class="mx-1">·</span>
              <span class="text-amber-700">{{ topicTotal(t.id) - topicKnownCount(t.id) }} not known</span>
            </p>
          </div>
          <span class="text-xl shrink-0 ml-2" :class="isTopicFullyKnown(t.id) ? 'text-blue-600' : 'text-orange-600'">→</span>
        </li>
      </ul>
    </main>
  </div>
</template>
