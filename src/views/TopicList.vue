<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getTopicList, getTopicData } from '@/data/topics'
import { useLearnStore } from '@/stores/learn'
import { useKnownStore } from '@/stores/known'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const learnStore = useLearnStore()
const knownStore = useKnownStore()
const themeStore = useThemeStore()

const topics = computed(() => getTopicList())
const learnCount = computed(() => learnStore.count)
const knownCount = computed(() => knownStore.count)

/** Total words available to learn from all topics (this app / website). */
const totalWordsAvailable = computed(() => {
  return topics.value.reduce((sum, t) => sum + (getTopicData(t.id)?.vocabs.length ?? 0), 0)
})

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

function clearAllData() {
  if (!confirm('Clear all saved data (words to learn and known words)? This cannot be undone.')) return
  learnStore.clear()
  knownStore.clear()
}
</script>

<template>
  <div class="min-h-screen p-4 sm:p-6 transition-colors duration-200 bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/50">
    <header class="text-center mb-8 pt-2">
      <div class="flex justify-end items-center gap-2 mb-2">
        <button
          type="button"
          class="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors underline"
          @click="clearAllData"
        >
          Clear data
        </button>
        <button
          type="button"
          class="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95 border border-slate-200/80 dark:border-slate-700"
          aria-label="Toggle dark mode"
          @click="themeStore.toggle()"
        >
          <span class="text-xl" aria-hidden="true">{{ themeStore.darkMode ? '☀️' : '🌙' }}</span>
        </button>
      </div>
      <h1 class="font-heading text-3xl sm:text-4xl md:text-5xl font-bold m-0 mb-2 bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
        Easy Vocab
      </h1>
      <p class="text-slate-600 dark:text-slate-400 m-0 mb-3 text-base sm:text-lg">
        Choose a topic to start learning
      </p>
      <p class="text-sm text-slate-500 dark:text-slate-400 m-0 mb-2">
        <span class="font-semibold text-slate-700 dark:text-slate-300">{{ totalWordsAvailable }} words</span>
        <span class="text-slate-500 dark:text-slate-400"> from {{ topics.length }} topics</span>
      </p>
      <p class="text-sm text-slate-500 dark:text-slate-400 m-0 mb-6">
        <span class="font-semibold text-teal-600 dark:text-teal-400">{{ knownCount }} known</span>
        <span class="mx-1.5">·</span>
        <span class="font-semibold text-amber-600 dark:text-amber-400">{{ learnCount }} to learn</span>
      </p>
      <div class="mt-2">
        <button
          v-if="learnCount > 0"
          type="button"
          class="px-6 py-3 rounded-xl font-semibold text-sm shadow-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 dark:from-teal-500 dark:to-cyan-500"
          @click="goReview"
        >
          📚 Review words to learn ({{ learnCount }})
        </button>
      </div>
    </header>

    <main class="max-w-2xl mx-auto">
      <ul class="list-none p-0 m-0 grid gap-4">
        <li
          v-for="(t, i) in topics"
          :key="t.id"
          class="flex items-center justify-between py-5 px-6 rounded-2xl cursor-pointer transition-all duration-300 border-2 animate-in fade-in"
          :style="{ animationDelay: `${i * 40 }ms` }"
          :class="isTopicFullyKnown(t.id)
            ? 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 hover:bg-teal-200/80 dark:hover:bg-teal-800/50 hover:shadow-lg shadow-md'
            : 'bg-white dark:bg-slate-800/90 border-transparent dark:border-slate-700 hover:-translate-y-1 hover:shadow-xl shadow-lg hover:border-teal-200 dark:hover:border-teal-700'"
          @click="startTopic(t.id)"
        >
          <div class="min-w-0">
            <span class="font-heading text-lg font-semibold text-slate-800 dark:text-slate-100">
              {{ t.name }} ({{ topicTotal(t.id) }})
            </span>
            <p class="m-0 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span class="text-teal-600 dark:text-teal-400 font-medium">{{ topicKnownCount(t.id) }} known</span>
              <span class="mx-1">·</span>
              <span class="text-amber-600 dark:text-amber-400 font-medium">{{ topicTotal(t.id) - topicKnownCount(t.id) }} not known</span>
            </p>
          </div>
          <span
            class="text-2xl shrink-0 ml-3 transition-transform duration-200 group-hover:translate-x-0.5"
            :class="isTopicFullyKnown(t.id) ? 'text-teal-600 dark:text-teal-400' : 'text-teal-500 dark:text-teal-400'"
            aria-hidden="true"
          >
            →
          </span>
        </li>
      </ul>
    </main>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-in {
  animation: fade-in 0.4s ease-out forwards;
}
</style>
