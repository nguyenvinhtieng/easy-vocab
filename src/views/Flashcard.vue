<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVocabStore } from '@/stores/vocab'
import { useLearnStore } from '@/stores/learn'
import { useKnownStore } from '@/stores/known'
import { useThemeStore } from '@/stores/theme'
import { getTopicData } from '@/data/topics'
import { useWordImage } from '@/composables/useWordImage'
import { useSpeech } from '@/composables/useSpeech'
import type { VocabItem } from '@/types/vocab'

const route = useRoute()
const router = useRouter()
const vocabStore = useVocabStore()
const learnStore = useLearnStore()
const knownStore = useKnownStore()
const themeStore = useThemeStore()

const typeId = computed(() => (route.params.typeId as string) ?? '')
const topicSlug = computed(() => (route.params.topicId as string) ?? '')
const topicKey = computed(() => (typeId.value && topicSlug.value ? `${typeId.value}/${topicSlug.value}` : ''))
const topicData = computed(() => getTopicData(topicKey.value))
const currentWord = computed(() => vocabStore.currentWord)
const vocabs = computed(() => vocabStore.currentVocabs)
const progress = computed(() => vocabStore.progress)

const flipped = ref(false)
const typedAnswer = ref('')
const checkResult = ref<'idle' | 'correct' | 'wrong'>('idle')
const showExamples = ref(true)
const showIpaGuide = ref(false)
/** When true, show only words not in known or learn list. */
const onlyNewWords = ref(false)

/** Count of words in this topic that are not in known or learn list (full topic list). */
const filteredCount = computed(() => {
  if (!topicKey.value || !topicData.value?.vocabs) return 0
  return topicData.value.vocabs.filter(
    (w) =>
      !learnStore.hasItem(topicKey.value, w.word) &&
      !knownStore.hasKnown(topicKey.value, w.word)
  ).length
})
const hasNoNewWords = computed(
  () =>
    onlyNewWords.value &&
    (topicData.value?.vocabs?.length ?? 0) > 0 &&
    filteredCount.value === 0
)

const wordForImage = computed(() => currentWord.value?.word ?? '')
const currentWordImage = useWordImage(wordForImage)
const { pronounce, pronounceSlow, isSpeaking } = useSpeech()

function initTopic() {
  if (!topicKey.value || !topicData.value) {
    router.replace({ name: 'topics' })
    return
  }
  vocabStore.setTopic(topicKey.value)
}

onMounted(initTopic)

function applyOnlyNewFilter() {
  vocabStore.setFilterOnlyNew(onlyNewWords.value)
  flipped.value = false
  typedAnswer.value = ''
  checkResult.value = 'idle'
}

watch(topicKey, () => {
  if (topicData.value) vocabStore.setTopic(topicKey.value)
  onlyNewWords.value = false
  flipped.value = false
  typedAnswer.value = ''
  checkResult.value = 'idle'
})

watch(
  () => vocabStore.currentIndex,
  () => {
    flipped.value = false
    typedAnswer.value = ''
    checkResult.value = 'idle'
  }
)

function partOfSpeechLabel(pos: string | string[]): string {
  return Array.isArray(pos) ? pos.join(', ') : pos
}

/** Split sentence into segments and mark occurrences of the learning word for highlight. */
function highlightWordInSentence(sentence: string, word: string): { text: string; highlight: boolean }[] {
  if (!word?.trim()) return [{ text: sentence, highlight: false }]
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = sentence.split(regex)
  return parts.map((text, i) => ({ text, highlight: i % 2 === 1 }))
}

function toggleFlip() {
  flipped.value = !flipped.value
}

function markKnown() {
  if (currentWord.value) {
    knownStore.add(topicKey.value, currentWord.value.word)
    learnStore.remove(topicKey.value, currentWord.value.word)
  }
  goNext()
}

function checkTyped() {
  if (!currentWord.value) return
  const expected = currentWord.value.word.trim().toLowerCase()
  const actual = typedAnswer.value.trim().toLowerCase()
  const correct = actual === expected
  checkResult.value = correct ? 'correct' : 'wrong'
  if (correct) learnStore.add(topicKey.value, currentWord.value.word)
}

function goNext() {
  if (vocabStore.hasNext) {
    vocabStore.nextWord()
  } else {
    router.push({ name: 'topics' })
  }
}

function goPrev() {
  if (vocabStore.hasPrev) vocabStore.prevWord()
}

function backToTopics() {
  router.push({ name: 'topics' })
}
</script>

<template>
  <div class="min-h-screen p-4 sm:p-6 transition-colors duration-200 bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/50">
    <header class="flex flex-wrap items-center gap-3 mb-6">
      <button
        type="button"
        class="px-4 py-2.5 rounded-xl font-semibold border-2 border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        @click="backToTopics"
      >
        ← Topics
      </button>
      <h1 class="flex-1 m-0 font-heading text-xl sm:text-2xl text-slate-800 dark:text-slate-100 min-w-0 truncate">
        {{ topicData?.topic }}
      </h1>
      <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <label class="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-slate-600 dark:text-slate-400">
          <input
            v-model="onlyNewWords"
            type="checkbox"
            class="rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500"
            @change="applyOnlyNewFilter()"
          />
          <span>Only new words</span>
          <span v-if="vocabs.length" class="text-slate-500 dark:text-slate-500">({{ filteredCount }} new)</span>
        </label>
        <button
          type="button"
          class="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
          aria-label="Toggle dark mode"
          @click="themeStore.toggle()"
        >
          <span class="text-lg">{{ themeStore.darkMode ? '☀️' : '🌙' }}</span>
        </button>
        <p class="m-0 text-teal-600 dark:text-teal-400 font-semibold">{{ progress.current }} / {{ progress.total }}</p>
      </div>
    </header>

    <main v-if="hasNoNewWords" class="max-w-[28rem] mx-auto text-center py-12">
      <p class="text-slate-600 dark:text-slate-400 mb-4">All words in this topic are already in your known or learning list.</p>
      <button
        type="button"
        class="px-4 py-2.5 rounded-xl font-semibold border-2 border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300"
        @click="onlyNewWords = false; applyOnlyNewFilter()"
      >
        Show all words
      </button>
    </main>
    <main v-else-if="currentWord" class="max-w-[28rem] mx-auto">
      <div class="card-perspective mb-10">
        <div
          class="card-outer cursor-pointer select-none"
          :class="{ 'is-flipped': flipped }"
          @click="toggleFlip"
        >
          <div class="card-inner">
            <div class="card-face card-front">
              <div class="w-full h-44 sm:h-48 bg-slate-100 dark:bg-slate-700/50 overflow-hidden rounded-t-[1.25rem]">
                <img
                  :src="currentWordImage"
                  :alt="currentWord.word"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div class="p-5 pt-4 flex-1 flex flex-col bg-white dark:bg-slate-800">
                <h2 class="font-heading m-0 mb-1 text-2xl sm:text-3xl font-semibold text-teal-600 dark:text-teal-400">
                  {{ currentWord.word }}
                </h2>
                <p v-if="currentWord.phonetic" class="m-0 mb-1 flex items-center gap-2 flex-wrap">
                  <span class="text-sm text-slate-500 dark:text-slate-400 font-mono">{{ currentWord.phonetic }}</span>
                  <button
                    type="button"
                    class="text-xs text-teal-600 dark:text-teal-400 hover:underline focus:outline-none"
                    aria-label="Show IPA guide"
                    @click.stop="showIpaGuide = !showIpaGuide"
                  >
                    {{ showIpaGuide ? 'Hide' : 'IPA?' }}
                  </button>
                </p>
                <div v-if="showIpaGuide" class="mb-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-left text-xs">
                  <p class="font-semibold mb-1.5 m-0 text-slate-700 dark:text-slate-200">IPA guide (US English)</p>
                  <p class="m-0 mb-1 text-slate-600 dark:text-slate-300"><strong>Stress:</strong> ˈ primary · ˌ secondary</p>
                  <p class="m-0 mb-1 text-slate-600 dark:text-slate-300"><strong>Vowels:</strong> iː see · ɪ sit · e bed · æ cat · ʌ cup · ɑː father · ɔː saw · ʊ book · uː blue · ə about · ɚ mother</p>
                  <p class="m-0 mb-1 text-slate-600 dark:text-slate-300"><strong>Diphthongs:</strong> eɪ day · aɪ eye · ɔɪ boy · oʊ go · aʊ now</p>
                  <p class="m-0 text-slate-600 dark:text-slate-300"><strong>Consonants:</strong> θ thin · ð this · ʃ ship · ʒ vision · tʃ cheese · dʒ jump · ŋ sing</p>
                </div>
                <p v-if="currentWord.partOfSpeech" class="m-0 mb-3 text-sm text-slate-400 dark:text-slate-500">
                  {{ partOfSpeechLabel(currentWord.partOfSpeech) }}
                </p>
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border-0 cursor-pointer hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    aria-label="Listen pronunciation"
                    :disabled="isSpeaking"
                    @click.stop="pronounce(currentWord.word)"
                  >
                    <span class="text-lg" aria-hidden="true">🔊</span>
                    Pronounce
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-0 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-60"
                    aria-label="Listen slowly for learning"
                    :disabled="isSpeaking"
                    title="Hear the word slowly (twice) to match the IPA"
                    @click.stop="pronounceSlow(currentWord.word)"
                  >
                    🐢 Slow
                  </button>
                </div>
                <p class="mt-3 text-xs text-slate-400 dark:text-slate-500">Tap card to reveal meaning · tap again to flip back</p>
              </div>
            </div>
            <div class="card-face card-back">
              <p class="m-0 text-xl font-semibold text-white">{{ currentWord.meaning }}</p>
              <p v-if="currentWord.phonetic" class="m-0 text-sm text-white/90 font-mono">{{ currentWord.phonetic }}</p>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/25 hover:bg-white/35 text-white border-0 cursor-pointer transition-colors disabled:opacity-60"
                  aria-label="Listen"
                  :disabled="isSpeaking"
                  @click.stop="pronounce(currentWord.word)"
                >
                  <span class="text-lg">🔊</span> Pronounce
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/20 hover:bg-white/30 text-white border-0 cursor-pointer transition-colors disabled:opacity-60"
                  aria-label="Listen slowly"
                  :disabled="isSpeaking"
                  title="Slow (twice) to match IPA"
                  @click.stop="pronounceSlow(currentWord.word)"
                >
                  🐢 Slow
                </button>
              </div>
              <div v-if="showExamples && currentWord.exampleSentences?.length" class="mt-auto text-left pt-2 border-t border-white/25">
                <p class="font-semibold mb-1.5 text-sm m-0 text-white">Examples</p>
                <ul class="m-0 pl-4 space-y-1 text-sm leading-relaxed text-white/95">
                  <li v-for="(s, i) in currentWord.exampleSentences" :key="i">
                    <template v-for="(seg, j) in highlightWordInSentence(s, currentWord.word)" :key="j">
                      <span v-if="seg.highlight" class="bg-amber-300/90 text-slate-900 font-semibold rounded px-0.5">{{ seg.text }}</span>
                      <template v-else>{{ seg.text }}</template>
                    </template>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Transition name="fade-slide">
        <div v-if="flipped" class="bg-white dark:bg-slate-800/95 rounded-2xl p-5 shadow-xl dark:shadow-none dark:ring-1 dark:ring-slate-700 mb-6">
          <div class="mb-4">
            <label for="type-word" class="block mb-2 font-semibold text-slate-800 dark:text-slate-200">Type the word</label>
            <div class="flex flex-wrap items-center gap-2">
              <input
                id="type-word"
                v-model="typedAnswer"
                type="text"
                class="flex-1 min-w-[120px] px-4 py-3 rounded-xl text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                :class="checkResult === 'idle'
                  ? 'border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:border-teal-500 focus:ring-teal-500/30'
                  : checkResult === 'correct'
                    ? 'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200'
                    : 'border-2 border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'"
                placeholder="Type here..."
                :disabled="checkResult !== 'idle'"
                @keydown.enter="checkResult === 'idle' ? checkTyped() : goNext()"
              />
              <button
                v-if="checkResult === 'idle'"
                type="button"
                class="px-5 py-3 rounded-xl font-semibold border-0 bg-gradient-to-r from-teal-500 to-cyan-500 text-white cursor-pointer shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                @click="checkTyped"
              >
                Check
              </button>
            </div>
          </div>
          <button
            type="button"
            class="w-full py-3 px-4 rounded-xl font-semibold text-sm border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            @click="markKnown"
          >
            ✓ I already know this word
          </button>
        </div>
      </Transition>

      <div class="mt-10 flex justify-between gap-3" :class="{ 'justify-end': !flipped }">
        <button
          v-if="flipped"
          type="button"
          class="px-5 py-2.5 rounded-xl font-semibold border-2 border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-50 dark:hover:bg-slate-700 transition-all duration-200"
          :disabled="!vocabStore.hasPrev"
          @click="goPrev"
        >
          ← Previous
        </button>
        <button
          v-if="flipped && checkResult !== 'idle'"
          type="button"
          class="px-5 py-2.5 rounded-xl font-semibold border-0 bg-gradient-to-r from-teal-500 to-cyan-500 text-white cursor-pointer shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
          @click="goNext"
        >
          Next →
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.card-perspective {
  perspective: 1000px;
}
.card-outer {
  position: relative;
  width: 100%;
  min-height: 340px;
}
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}
.card-outer.is-flipped .card-inner {
  transform: rotateY(180deg);
}
.card-face {
  position: absolute;
  width: 100%;
  min-height: 320px;
  backface-visibility: hidden;
  border-radius: 1.25rem;
  box-shadow: 0 10px 40px -10px rgb(0 0 0 / 0.12), 0 4px 12px -4px rgb(0 0 0 / 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.dark .card-face {
  box-shadow: 0 10px 40px -10px rgb(0 0 0 / 0.4);
}
.card-front {
  background: transparent;
}
.card-back {
  background: linear-gradient(145deg, #0f766e 0%, #0e7490 50%, #155e75 100%);
  color: #fff;
  transform: rotateY(180deg);
  padding: 1.5rem;
  gap: 0.75rem;
}
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
