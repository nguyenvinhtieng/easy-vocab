<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVocabStore } from '@/stores/vocab'
import { useLearnStore } from '@/stores/learn'
import { useKnownStore } from '@/stores/known'
import { getTopicData } from '@/data/topics'
import type { VocabItem } from '@/types/vocab'

const route = useRoute()
const router = useRouter()
const vocabStore = useVocabStore()
const learnStore = useLearnStore()
const knownStore = useKnownStore()

const topicId = computed(() => (route.params.topicId as string) ?? '')
const topicData = computed(() => getTopicData(topicId.value))
const currentWord = computed(() => vocabStore.currentWord)
const vocabs = computed(() => vocabStore.currentVocabs)
const progress = computed(() => vocabStore.progress)

const flipped = ref(false)
const typedAnswer = ref('')
const checkResult = ref<'idle' | 'correct' | 'wrong'>('idle')
const showExamples = ref(true)

function initTopic() {
  if (!topicId.value || !topicData.value) {
    router.replace({ name: 'topics' })
    return
  }
  vocabStore.setTopic(topicId.value)
}

onMounted(initTopic)

watch(topicId, () => {
  if (topicData.value) vocabStore.setTopic(topicId.value)
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

function imageUrl(word: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(word)}/400/300`
}

function partOfSpeechLabel(pos: string | string[]): string {
  return Array.isArray(pos) ? pos.join(', ') : pos
}

function speak(word: string) {
  try {
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    u.rate = 0.9
    speechSynthesis.speak(u)
  } catch {
    // ignore
  }
}

function toggleFlip() {
  flipped.value = !flipped.value
}

function markKnown() {
  if (currentWord.value) {
    knownStore.add(topicId.value, currentWord.value.word)
    learnStore.remove(topicId.value, currentWord.value.word)
  }
  goNext()
}

function checkTyped() {
  if (!currentWord.value) return
  const expected = currentWord.value.word.trim().toLowerCase()
  const actual = typedAnswer.value.trim().toLowerCase()
  const correct = actual === expected
  checkResult.value = correct ? 'correct' : 'wrong'
  if (correct) learnStore.add(topicId.value, currentWord.value.word)
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
  <div class="min-h-screen p-4 bg-gradient-to-br from-amber-50 via-orange-50/80 to-orange-100">
    <header class="flex flex-wrap items-center gap-3 mb-6">
      <button
        type="button"
        class="px-4 py-2 rounded-full font-semibold border-2 border-amber-300 bg-white text-orange-700 hover:shadow-md transition-shadow"
        @click="backToTopics"
      >
        ← Topics
      </button>
      <h1 class="flex-1 m-0 text-xl sm:text-2xl text-gray-800">
        {{ topicData?.topic }}
      </h1>
      <p class="m-0 text-amber-800 font-semibold">
        {{ progress.current }} / {{ progress.total }}
      </p>
    </header>

    <main v-if="currentWord" class="max-w-[28rem] mx-auto">
      <div class="card-perspective mb-6">
        <div
          class="card-outer cursor-pointer"
          :class="{ 'is-flipped': flipped }"
          @click="toggleFlip"
        >
          <div class="card-inner">
            <div class="card-face card-front">
              <div class="w-full h-40 bg-amber-50/80 overflow-hidden">
                <img
                  :src="imageUrl(currentWord.word)"
                  :alt="currentWord.word"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div class="p-4 pt-3 flex-1 flex flex-col">
                <h2 class="m-0 mb-1 text-2xl sm:text-3xl text-orange-600 font-semibold">
                  {{ currentWord.word }}
                </h2>
                <p v-if="currentWord.phonetic" class="m-0 mb-1 text-sm text-gray-500">
                  {{ currentWord.phonetic }}
                </p>
                <p v-if="currentWord.partOfSpeech" class="m-0 mb-2 text-sm text-gray-400">
                  {{ partOfSpeechLabel(currentWord.partOfSpeech) }}
                </p>
                <button
                  type="button"
                  class="self-start px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 text-gray-800 border-0 cursor-pointer hover:scale-[1.03] transition-transform"
                  aria-label="Listen"
                  @click.stop="speak(currentWord.word)"
                >
                  🔊 Pronounce
                </button>
                <p class="mt-2 text-xs text-gray-400">Tap card to reveal meaning (tap again to flip back)</p>
              </div>
            </div>
            <div class="card-face card-back">
              <p class="m-0 text-xl font-semibold text-gray-800">{{ currentWord.meaning }}</p>
              <p v-if="currentWord.phonetic" class="m-0 text-sm text-gray-800/85">{{ currentWord.phonetic }}</p>
              <button
                type="button"
                class="self-start px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 text-gray-800 border-0 cursor-pointer"
                aria-label="Listen"
                @click.stop="speak(currentWord.word)"
              >
                🔊 Pronounce
              </button>
              <div v-if="showExamples && currentWord.exampleSentences?.length" class="mt-auto text-left">
                <p class="font-semibold mb-1 text-sm m-0">Examples:</p>
                <ul class="m-0 pl-4 space-y-1 text-sm leading-snug">
                  <li v-for="(s, i) in currentWord.exampleSentences" :key="i">{{ s }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="flipped" class="bg-white rounded-2xl p-5 shadow-md mb-4">
        <div class="mb-4">
          <label for="type-word" class="block mb-2 font-semibold text-gray-800">Type the word:</label>
          <div class="flex flex-wrap items-center gap-2">
            <input
              id="type-word"
              v-model="typedAnswer"
              type="text"
              class="flex-1 min-w-[120px] px-3 py-2.5 border-2 rounded-xl text-base focus:outline-none transition-colors"
              :class="checkResult === 'idle' ? 'border-amber-300 focus:border-orange-500' : checkResult === 'correct' ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'"
              placeholder="Type here..."
              :disabled="checkResult !== 'idle'"
              @keydown.enter="checkResult === 'idle' ? checkTyped() : goNext()"
            />
            <button
              v-if="checkResult === 'idle'"
              type="button"
              class="px-4 py-2.5 rounded-xl font-semibold border-0 bg-orange-600 text-white cursor-pointer"
              @click="checkTyped"
            >
              Check
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="flex-1 min-w-[140px] py-2.5 px-4 rounded-full font-semibold text-sm border-2 border-amber-300 bg-white text-gray-800 cursor-pointer hover:-translate-y-0.5 transition-transform"
            @click="markKnown"
          >
            ✓ I already know this word
          </button>
        </div>
      </div>

      <div class="mt-6 flex justify-between gap-2">
        <button
          type="button"
          class="px-4 py-2.5 rounded-full font-semibold border-2 border-amber-300 bg-white text-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-50/50 transition-colors"
          :disabled="!vocabStore.hasPrev"
          @click="goPrev"
        >
          ← Previous
        </button>
        <button
          v-if="flipped && checkResult !== 'idle'"
          type="button"
          class="px-4 py-2.5 rounded-full font-semibold border-2 border-amber-400 bg-amber-400 text-gray-800 cursor-pointer"
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
  min-height: 320px;
}
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.card-outer.is-flipped .card-inner {
  transform: rotateY(180deg);
}
.card-face {
  position: absolute;
  width: 100%;
  min-height: 300px;
  backface-visibility: hidden;
  border-radius: 1.25rem;
  box-shadow: 0 8px 24px rgba(196, 92, 62, 0.15);
  overflow: hidden;
}
.card-front {
  background: #fff;
  display: flex;
  flex-direction: column;
}
.card-back {
  background: linear-gradient(145deg, #e8b86d, #d4a24c);
  color: #2d2d2d;
  transform: rotateY(180deg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
