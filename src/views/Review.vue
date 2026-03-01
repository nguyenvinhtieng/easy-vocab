<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLearnStore } from '@/stores/learn'
import { useKnownStore } from '@/stores/known'
import { useThemeStore } from '@/stores/theme'
import { getTopicData, getVocabByWord } from '@/data/topics'
import { useWordImage } from '@/composables/useWordImage'
import { useSpeech } from '@/composables/useSpeech'
import type { LearnItem, KnownItem } from '@/types/vocab'

const router = useRouter()
const learnStore = useLearnStore()
const knownStore = useKnownStore()
const themeStore = useThemeStore()

const items = computed(() => learnStore.all)
const currentIndex = ref(0)
const flipped = ref(false)
const typedAnswer = ref('')
const checkResult = ref<'idle' | 'correct' | 'wrong'>('idle')
const showExportSuccess = ref(false)
const showImportSuccess = ref(false)
const importError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const showWordsList = ref(false)
const showIpaGuide = ref(false)
const { pronounce, pronounceSlow, isSpeaking } = useSpeech()

const currentItem = computed(() => items.value[currentIndex.value])
const currentDisplay = computed(() => {
  const item = currentItem.value
  if (!item) return null
  const topic = getTopicData(item.topicId)
  const vocab = getVocabByWord(item.topicId, item.word)
  return {
    topicName: topic?.topic ?? item.topicId,
    word: item.word,
    vocab,
  }
})
const hasNext = computed(() => currentIndex.value < items.value.length - 1)
const hasPrev = computed(() => currentIndex.value > 0)
const progress = computed(() => ({
  current: currentIndex.value + 1,
  total: items.value.length,
}))

const listRows = computed(() =>
  items.value.map((item) => {
    const topic = getTopicData(item.topicId)
    return { topicName: topic?.topic ?? item.topicId, word: item.word }
  })
)

const wordForImage = computed(() => currentDisplay.value?.word ?? '')
const currentWordImage = useWordImage(wordForImage)

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

function checkTyped() {
  if (!currentItem.value) return
  const expected = currentItem.value.word.trim().toLowerCase()
  const actual = typedAnswer.value.trim().toLowerCase()
  checkResult.value = actual === expected ? 'correct' : 'wrong'
}

function nextWord() {
  if (hasNext.value) {
    currentIndex.value++
    flipped.value = false
    typedAnswer.value = ''
    checkResult.value = 'idle'
  } else {
    router.push({ name: 'topics' })
  }
}

function prevWord() {
  if (hasPrev.value) {
    currentIndex.value--
    flipped.value = false
    typedAnswer.value = ''
    checkResult.value = 'idle'
  }
}

function removeCurrent() {
  if (!currentItem.value) return
  knownStore.add(currentItem.value.topicId, currentItem.value.word)
  learnStore.remove(currentItem.value.topicId, currentItem.value.word)
  if (items.value.length === 0) {
    router.push({ name: 'topics' })
  } else if (currentIndex.value >= items.value.length) {
    currentIndex.value = Math.max(0, items.value.length - 1)
  }
  flipped.value = false
  typedAnswer.value = ''
  checkResult.value = 'idle'
}

function backToTopics() {
  router.push({ name: 'topics' })
}

function exportJson() {
  const data = { learn: learnStore.all, known: knownStore.all }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'easy-vocab-backup.json'
  a.click()
  URL.revokeObjectURL(url)
  showExportSuccess.value = true
  setTimeout(() => (showExportSuccess.value = false), 2000)
}

function triggerImport() {
  importError.value = ''
  fileInput.value?.click()
}

function clearAllData() {
  if (!confirm('Clear all saved data (words to learn and known words)? This cannot be undone.')) return
  learnStore.clear()
  knownStore.clear()
  router.push({ name: 'topics' })
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const text = reader.result as string
      const parsed = JSON.parse(text) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && ('learn' in parsed || 'known' in parsed)) {
        const data = parsed as { learn?: LearnItem[]; known?: KnownItem[] }
        if (Array.isArray(data.learn)) learnStore.replaceAll(data.learn)
        if (Array.isArray(data.known)) knownStore.replaceAll(data.known)
      } else if (Array.isArray(parsed)) {
        learnStore.replaceAll(parsed as LearnItem[])
      } else {
        importError.value = 'Invalid format'
        return
      }
      showImportSuccess.value = true
      setTimeout(() => (showImportSuccess.value = false), 2000)
    } catch (err) {
      importError.value = (err as Error).message
    }
  }
  reader.readAsText(file)
  input.value = ''
}

onMounted(() => {
  if (items.value.length === 0) {
    router.replace({ name: 'topics' })
  }
})
</script>

<template>
  <div class="min-h-screen p-4 sm:p-6 transition-colors duration-200 bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/50">
    <header class="flex flex-wrap items-center gap-3 mb-4">
      <button
        type="button"
        class="px-4 py-2.5 rounded-xl font-semibold border-2 border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm hover:shadow-md transition-all duration-200"
        @click="backToTopics"
      >
        ← Topics
      </button>
      <h1 class="flex-1 m-0 font-heading text-xl sm:text-2xl text-slate-800 dark:text-slate-100">Words to learn</h1>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-sm hover:shadow-md transition-all border border-slate-200/80 dark:border-slate-700"
          aria-label="Toggle dark mode"
          @click="themeStore.toggle()"
        >
          <span class="text-lg">{{ themeStore.darkMode ? '☀️' : '🌙' }}</span>
        </button>
        <p class="m-0 text-teal-600 dark:text-teal-400 font-semibold">{{ progress.current }} / {{ progress.total }}</p>
      </div>
    </header>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <button
        type="button"
        class="px-4 py-2.5 rounded-xl font-semibold border-2 border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 text-sm shadow-sm hover:shadow-md transition-all"
        @click="exportJson"
      >
        📤 Export
      </button>
      <button
        type="button"
        class="px-4 py-2.5 rounded-xl font-semibold border-2 border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 text-sm shadow-sm hover:shadow-md transition-all"
        @click="triggerImport"
      >
        📥 Import
      </button>
      <button
        type="button"
        class="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors underline"
        @click="clearAllData"
      >
        Clear data
      </button>
      <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="onFileSelected" />
      <span v-if="showExportSuccess" class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200">Exported!</span>
      <span v-if="showImportSuccess" class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200">Imported.</span>
      <span v-if="importError" class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">{{ importError }}</span>
    </div>

    <section class="mb-4 max-w-[28rem] mx-auto">
      <button
        type="button"
        class="w-full text-left py-3 px-4 rounded-xl text-sm font-medium text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors border border-teal-200/50 dark:border-teal-700/50"
        @click="showWordsList = !showWordsList"
      >
        {{ showWordsList ? '▼' : '▶' }} Words in your list ({{ items.length }})
      </button>
      <Transition name="fade-slide">
        <ul
          v-show="showWordsList"
          class="mt-2 m-0 p-0 list-none space-y-1.5 max-h-40 overflow-y-auto bg-white dark:bg-slate-800/90 rounded-xl p-3 shadow-lg dark:ring-1 dark:ring-slate-700"
        >
          <li
            v-for="(row, idx) in listRows"
            :key="`${row.topicName}-${row.word}-${idx}`"
            class="flex justify-between items-center py-2.5 px-3 rounded-lg text-sm transition-colors"
            :class="idx === currentIndex ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-slate-50 dark:bg-slate-700/30'"
          >
            <span class="font-medium text-slate-800 dark:text-slate-200">{{ row.word }}</span>
            <span class="text-slate-500 dark:text-slate-400 text-xs">{{ row.topicName }}</span>
          </li>
        </ul>
      </Transition>
    </section>

    <main v-if="currentItem && currentDisplay" class="max-w-[28rem] mx-auto">
      <div class="card-perspective mb-10">
        <div
          class="card-outer cursor-pointer select-none"
          :class="{ 'is-flipped': flipped }"
          @click="toggleFlip"
        >
          <div class="card-inner">
            <div class="card-face card-front">
              <div class="w-full h-44 bg-slate-100 dark:bg-slate-700/50 overflow-hidden rounded-t-[1.25rem]">
                <img
                  :src="currentWordImage"
                  :alt="currentDisplay.word"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div class="p-5 pt-4 flex-1 flex flex-col bg-white dark:bg-slate-800">
                <h2 class="font-heading m-0 mb-1 text-2xl text-teal-600 dark:text-teal-400 font-semibold">{{ currentDisplay.word }}</h2>
                <p v-if="currentDisplay.vocab?.phonetic" class="m-0 mb-1 flex items-center gap-2 flex-wrap">
                  <span class="text-sm text-slate-500 dark:text-slate-400 font-mono">{{ currentDisplay.vocab.phonetic }}</span>
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
                <p v-if="currentDisplay.vocab?.partOfSpeech" class="m-0 mb-3 text-sm text-slate-400 dark:text-slate-500">{{ partOfSpeechLabel(currentDisplay.vocab.partOfSpeech) }}</p>
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border-0 cursor-pointer hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors disabled:opacity-60"
                    aria-label="Listen"
                    :disabled="isSpeaking"
                    @click.stop="pronounce(currentDisplay.word)"
                  >
                    <span class="text-lg">🔊</span> Pronounce
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-0 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-60"
                    aria-label="Listen slowly"
                    :disabled="isSpeaking"
                    title="Slow (twice) to match IPA"
                    @click.stop="pronounceSlow(currentDisplay.word)"
                  >
                    🐢 Slow
                  </button>
                </div>
                <p class="mt-3 text-xs text-slate-400 dark:text-slate-500">Tap card to reveal meaning</p>
              </div>
            </div>
            <div class="card-face card-back">
              <p class="text-sm text-white/85 m-0 mb-1">{{ currentDisplay.topicName }}</p>
              <p class="m-0 text-xl font-semibold text-white">{{ currentDisplay.vocab?.meaning ?? currentDisplay.word }}</p>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/25 hover:bg-white/35 text-white border-0 cursor-pointer transition-colors disabled:opacity-60"
                  aria-label="Listen"
                  :disabled="isSpeaking"
                  @click.stop="pronounce(currentDisplay.word)"
                >
                  <span class="text-lg">🔊</span> Pronounce
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/20 hover:bg-white/30 text-white border-0 cursor-pointer disabled:opacity-60"
                  aria-label="Listen slowly"
                  :disabled="isSpeaking"
                  @click.stop="pronounceSlow(currentDisplay.word)"
                >
                  🐢 Slow
                </button>
              </div>
              <div v-if="currentDisplay.vocab?.exampleSentences?.length" class="mt-auto text-left pt-2 border-t border-white/25">
                <p class="font-semibold mb-1.5 text-sm m-0 text-white">Examples</p>
                <ul class="m-0 pl-4 space-y-1 text-sm leading-relaxed text-white/95">
                  <li v-for="(s, i) in currentDisplay.vocab.exampleSentences" :key="i">
                    <template v-for="(seg, j) in highlightWordInSentence(s, currentDisplay.word)" :key="j">
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
        <div v-if="flipped" class="bg-white dark:bg-slate-800/95 rounded-2xl p-5 shadow-xl dark:ring-1 dark:ring-slate-700 mb-6">
          <div class="mb-4">
            <label for="review-type-word" class="block mb-2 font-semibold text-slate-800 dark:text-slate-200">Type the word</label>
            <div class="flex flex-wrap items-center gap-2">
              <input
                id="review-type-word"
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
                @keydown.enter="checkResult === 'idle' ? checkTyped() : nextWord()"
              />
              <button
                v-if="checkResult === 'idle'"
                type="button"
                class="px-5 py-3 rounded-xl font-semibold border-0 bg-gradient-to-r from-teal-500 to-cyan-500 text-white cursor-pointer shadow-md hover:shadow-lg transition-all"
                @click="checkTyped"
              >
                Check
              </button>
            </div>
          </div>
          <button
            type="button"
            class="w-full py-3 rounded-xl font-semibold border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            @click="removeCurrent"
          >
            🗑 Remove from list
          </button>
        </div>
      </Transition>

      <div class="mt-10 flex justify-between gap-3" :class="{ 'justify-end': !flipped }">
        <button
          v-if="flipped"
          type="button"
          class="px-5 py-2.5 rounded-xl font-semibold border-2 border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-50 dark:hover:bg-slate-700 transition-all"
          :disabled="!hasPrev"
          @click="prevWord"
        >
          ← Previous
        </button>
        <button
          v-if="flipped && checkResult !== 'idle'"
          type="button"
          class="px-5 py-2.5 rounded-xl font-semibold border-0 bg-gradient-to-r from-teal-500 to-cyan-500 text-white cursor-pointer shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          @click="nextWord"
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
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
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
  box-shadow: 0 10px 40px -10px rgb(0 0 0 / 0.12);
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
