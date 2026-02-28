<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLearnStore } from '@/stores/learn'
import { useKnownStore } from '@/stores/known'
import { getTopicData, getVocabByWord } from '@/data/topics'
import type { LearnItem, KnownItem } from '@/types/vocab'

const router = useRouter()
const learnStore = useLearnStore()
const knownStore = useKnownStore()

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

/** Current raw learn item (topicId, word, addedAt). */
const currentItem = computed(() => items.value[currentIndex.value])
/** Resolved topic name and full vocab for current item (for display). */
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

/** List rows for "words in list" display: topic name + word. */
const listRows = computed(() =>
  items.value.map((item) => {
    const topic = getTopicData(item.topicId)
    return { topicName: topic?.topic ?? item.topicId, word: item.word }
  })
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
  <div class="min-h-screen p-4 bg-gradient-to-br from-amber-50 via-orange-50/80 to-orange-100">
    <header class="flex flex-wrap items-center gap-3 mb-4">
      <button
        type="button"
        class="px-4 py-2 rounded-full font-semibold border-2 border-amber-300 bg-white text-orange-700 cursor-pointer"
        @click="backToTopics"
      >
        ← Topics
      </button>
      <h1 class="flex-1 m-0 text-xl sm:text-2xl text-gray-800">Words to learn</h1>
      <p class="m-0 text-amber-800 font-semibold">{{ progress.current }} / {{ progress.total }}</p>
    </header>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <button
        type="button"
        class="px-4 py-2 rounded-full font-semibold border-2 border-amber-300 bg-white text-orange-600 cursor-pointer text-sm"
        @click="exportJson"
      >
        📤 Export to JSON
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-full font-semibold border-2 border-amber-300 bg-white text-orange-600 cursor-pointer text-sm"
        @click="triggerImport"
      >
        📥 Import to list
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="hidden"
        @change="onFileSelected"
      />
      <span v-if="showExportSuccess" class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-200 text-green-800">Exported!</span>
      <span v-if="showImportSuccess" class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-200 text-green-800">Imported! Added to list below.</span>
      <span v-if="importError" class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-200 text-red-800">{{ importError }}</span>
    </div>

    <!-- Toggle: Words in your list (collapsed by default to save space) -->
    <section class="mb-4 max-w-[28rem] mx-auto">
      <button
        type="button"
        class="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-amber-800 bg-amber-100/80 hover:bg-amber-100 transition-colors"
        @click="showWordsList = !showWordsList"
      >
        {{ showWordsList ? '▼' : '▶' }} Words in your list ({{ items.length }})
      </button>
      <ul
        v-show="showWordsList"
        class="mt-2 m-0 p-0 list-none space-y-1.5 max-h-40 overflow-y-auto bg-white rounded-xl p-3 shadow-sm"
      >
        <li
          v-for="(row, idx) in listRows"
          :key="`${row.topicName}-${row.word}-${idx}`"
          class="flex justify-between items-center py-2 px-3 rounded-lg text-sm"
          :class="idx === currentIndex ? 'bg-amber-100' : 'bg-gray-50'"
        >
          <span class="font-medium text-gray-800">{{ row.word }}</span>
          <span class="text-gray-500 text-xs">{{ row.topicName }}</span>
        </li>
      </ul>
    </section>

    <main v-if="currentItem && currentDisplay" class="max-w-[28rem] mx-auto">
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
                  :src="imageUrl(currentDisplay.word)"
                  :alt="currentDisplay.word"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div class="p-4 pt-3 flex-1 flex flex-col">
                <h2 class="m-0 mb-1 text-2xl text-orange-600 font-semibold">{{ currentDisplay.word }}</h2>
                <p v-if="currentDisplay.vocab?.phonetic" class="m-0 mb-1 text-sm text-gray-500">{{ currentDisplay.vocab.phonetic }}</p>
                <p v-if="currentDisplay.vocab?.partOfSpeech" class="m-0 mb-2 text-sm text-gray-400">
                  {{ partOfSpeechLabel(currentDisplay.vocab.partOfSpeech) }}
                </p>
                <button
                  type="button"
                  class="self-start px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 text-gray-800 border-0 cursor-pointer"
                  aria-label="Listen"
                  @click.stop="speak(currentDisplay.word)"
                >
                  🔊 Pronounce
                </button>
                <p class="mt-2 text-xs text-gray-400">Tap card to reveal meaning (tap again to flip back)</p>
              </div>
            </div>
            <div class="card-face card-back">
              <p class="text-sm opacity-90 m-0 mb-1">{{ currentDisplay.topicName }}</p>
              <p class="m-0 text-xl font-semibold text-gray-800">{{ currentDisplay.vocab?.meaning ?? currentDisplay.word }}</p>
              <button
                type="button"
                class="self-start px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 text-gray-800 border-0 cursor-pointer"
                aria-label="Listen"
                @click.stop="speak(currentDisplay.word)"
              >
                🔊 Pronounce
              </button>
              <div v-if="currentDisplay.vocab?.exampleSentences?.length" class="mt-auto text-left">
                <p class="font-semibold mb-1 text-sm m-0">Examples:</p>
                <ul class="m-0 pl-4 space-y-1 text-sm leading-snug">
                  <li v-for="(s, i) in currentDisplay.vocab.exampleSentences" :key="i">{{ s }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="flipped" class="bg-white rounded-2xl p-5 shadow-md mb-4">
        <div class="mb-4">
          <label for="review-type-word" class="block mb-2 font-semibold text-gray-800">Type the word:</label>
          <div class="flex flex-wrap items-center gap-2">
            <input
              id="review-type-word"
              v-model="typedAnswer"
              type="text"
              class="flex-1 min-w-[120px] px-3 py-2.5 border-2 rounded-xl focus:outline-none transition-colors"
              :class="checkResult === 'idle' ? 'border-amber-300 focus:border-orange-500' : checkResult === 'correct' ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'"
              placeholder="Type here..."
              :disabled="checkResult !== 'idle'"
              @keydown.enter="checkResult === 'idle' ? checkTyped() : nextWord()"
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
        <button
          type="button"
          class="w-full py-2.5 rounded-full font-semibold border-2 border-red-300 bg-white text-red-700 cursor-pointer"
          @click="removeCurrent"
        >
          🗑 Remove from list
        </button>
      </div>

      <div class="mt-6 flex justify-between gap-2">
        <button
          type="button"
          class="px-4 py-2.5 rounded-full font-semibold border-2 border-amber-300 bg-white text-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!hasPrev"
          @click="prevWord"
        >
          ← Previous
        </button>
        <button
          v-if="flipped && checkResult !== 'idle'"
          type="button"
          class="px-4 py-2.5 rounded-full font-semibold border-2 border-amber-400 bg-amber-400 text-gray-800 cursor-pointer"
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
  transform: rotateY(180deg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
