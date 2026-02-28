/**
 * Text-to-speech for vocabulary learning.
 * Uses a clear en-US voice and optional slow rate to match IPA and aid learning.
 */
import { ref, onMounted } from 'vue'

const DEFAULT_RATE = 0.9
const SLOW_RATE = 0.65
const PAUSE_BETWEEN_REPEAT_MS = 400

let preferredVoice: SpeechSynthesisVoice | null = null

function getVoices(): SpeechSynthesisVoice[] {
  return typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : []
}

function chooseEnUsVoice(): SpeechSynthesisVoice | null {
  const voices = getVoices().filter((v) => v.lang.startsWith('en-US'))
  if (voices.length === 0) return null
  // Prefer known clear voices (names vary by OS/browser)
  const preferred = voices.find(
    (v) =>
      v.name.includes('Google') ||
      v.name.includes('Zira') ||
      v.name.includes('Samantha') ||
      v.name.includes('Daniel') ||
      v.name.includes('US English')
  )
  return preferred ?? voices[0] ?? null
}

function loadVoices() {
  const voices = getVoices()
  if (voices.length > 0) {
    preferredVoice = chooseEnUsVoice()
    return
  }
  // Chrome loads voices asynchronously
  if (typeof speechSynthesis !== 'undefined' && 'onvoiceschanged' in speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => {
      preferredVoice = chooseEnUsVoice()
    }
  }
}

export function useSpeech() {
  const isSpeaking = ref(false)

  onMounted(loadVoices)

  function ensureVoice() {
    if (!preferredVoice && getVoices().length > 0) preferredVoice = chooseEnUsVoice()
  }

  function speak(
    text: string,
    options: { slow?: boolean; repeat?: boolean } = {}
  ): void {
    if (!text?.trim() || typeof speechSynthesis === 'undefined') return
    ensureVoice()
    const { slow = false, repeat = false } = options
    const rate = slow ? SLOW_RATE : DEFAULT_RATE

    speechSynthesis.cancel()

    const doSpeak = (r: number) => {
      return new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(text.trim())
        u.lang = 'en-US'
        u.rate = r
        u.pitch = 1
        u.volume = 1
        if (preferredVoice) u.voice = preferredVoice
        u.onend = () => resolve()
        u.onerror = () => resolve()
        isSpeaking.value = true
        speechSynthesis.speak(u)
      })
    }

    const run = async () => {
      await doSpeak(rate)
      if (repeat && slow) {
        await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_REPEAT_MS))
        await doSpeak(SLOW_RATE)
      }
      isSpeaking.value = false
    }

    run()
  }

  /** Normal speed – good for quick listen. */
  function pronounce(word: string) {
    speak(word, { slow: false })
  }

  /** Slow speed – easier to hear each sound and match to IPA. */
  function pronounceSlow(word: string) {
    speak(word, { slow: true, repeat: true })
  }

  function stop() {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel()
      isSpeaking.value = false
    }
  }

  return { pronounce, pronounceSlow, speak, stop, isSpeaking }
}
