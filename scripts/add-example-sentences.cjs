/**
 * Add generic exampleSentences to any vocab item that is missing them.
 * Run from project root: node scripts/add-example-sentences.cjs
 */
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'src', 'data')

function getPos(v) {
  const pos = v.partOfSpeech
  const first = Array.isArray(pos) ? pos[0] : pos
  return (first || 'noun').toLowerCase()
}

function needsArticle(word) {
  const firstWord = word.trim().toLowerCase().split(/\s+/)[0]
  if (!firstWord) return 'a'
  if (/^[aeiou]/.test(firstWord)) return 'an'
  return 'a'
}

function generateSentences(word, pos) {
  const w = word.trim()
  const article = needsArticle(w)
  switch (pos) {
    case 'verb':
    case 'v':
      return [`I can ${w} every day.`, `She likes to ${w}.`]
    case 'adjective':
    case 'adj':
      return [`It is ${w}.`, `The day is ${w}.`]
    case 'adverb':
    case 'adv':
      return [`She runs ${w}.`, `He speaks ${w}.`]
    case 'noun':
    case 'n':
    default:
      return [`This is ${article} ${w}.`, `I like the ${w}.`]
  }
}

const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))
let totalAdded = 0

for (const file of files) {
  const filePath = path.join(DATA_DIR, file)
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)
  if (!data.vocabs || !Array.isArray(data.vocabs)) continue

  let changed = false
  for (const v of data.vocabs) {
    if (!v.exampleSentences || v.exampleSentences.length === 0) {
      v.exampleSentences = generateSentences(v.word, getPos(v))
      changed = true
      totalAdded += 1
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    console.log('Updated:', file)
  }
}

console.log('Done. Added example sentences for', totalAdded, 'words.')
