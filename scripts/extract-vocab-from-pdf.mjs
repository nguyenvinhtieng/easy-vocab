/**
 * Extract vocabulary from a PDF and write one JSON file per topic.
 * Usage: node scripts/extract-vocab-from-pdf.mjs [path-to.pdf]
 *        If no path given, finds the first PDF under src/data/ and processes it.
 *
 * Expects PDF structure: topic headings (e.g. "Chủ đề X", "Topic", "Unit 1") then
 * lines like:  word (n) /phonetic/ meaning   or   word - meaning   or   word  meaning
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// --- Topic detection: line is a topic heading (start of new section)
const TOPIC_PATTERNS = [
  /^\s*(?:Chủ đề|CHỦ ĐỀ|Topic|TOPIC|Unit|UNIT|Phần|PHẦN|Part|PART)\s*[:\s]*\d*\s*(.+)$/i,
  /^\s*\d+\.\s*([A-ZÀ-Ỹa-zà-ỹ\s]{3,60})\s*$/,  // "1. Education"
  /^\s*([A-ZÀ-Ỹ][A-Za-zà-ỹ\s]{2,50})\s*$/,     // Standalone title line (capitalized, no slashes)
]

// --- Table format: "STT  Từ vựng  Loại từ  Phiên âm  Nghĩa của từ" (skip this header)
const TABLE_HEADER = /STT\s*(Từ vựng|Tu vung|từ vựng).*Loại từ|Loai tu.*Phiên âm|Phien am.*Nghĩa/i
// --- Table row: number  word  pos  [phonetic]  meaning  (tabs or 2+ spaces). Word is one token (no spaces) or short phrase.
const TABLE_ROW = /^\s*(\d+)\s+([A-Za-z][A-Za-z'-]*)\s+(n|v|adj|adv|n\.|v\.|adj\.|adv\.|prep|conj|n\s*,\s*v|v\s*,\s*n)\s*(\/[^/]*\/)?\s*(.+)$/i
// --- Vocab line: word (pos?) /phonetic?/ meaning  or  word - meaning  or  word\tmeaning
const VOCAB_WITH_PHONETIC = /^\s*([A-Za-z][A-Za-z\s'-]+?)\s*\((n|v|adj|adv|prep|conj)\)\s*(\/[^/]+\/)?\s*(.+)$/
const VOCAB_WITH_DASH = /^\s*([A-Za-z][A-Za-z\s'-]+?)\s*[-–—]\s*(.+)$/
const VOCAB_TAB_OR_SPACES = /^\s*([A-Za-z][A-Za-z\s'-]+?)\s{2,}(.+)$/
const PHONETIC_ONLY = /^\/[^/]+\/$/

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .slice(0, 80) || 'topic'
}

function isTableHeader(line) {
  return TABLE_HEADER.test(line.trim())
}

/** Parse table row: "989  wealthy  adj  /ˈwɛlθi/  giàu, giàu có" -> { word, partOfSpeech, phonetic, meaning } */
function parseTableRow(line) {
  const t = line.trim()
  const m = t.match(TABLE_ROW)
  if (!m) return null
  let [, num, word, pos, phonetic, meaning] = m
  if (!word || !meaning) return null
  // If meaning starts with ", v /" or ", n /" then phonetic was merged into meaning
  const meaningPhonetic = meaning.match(/^,\s*(n|v)\s+(\/[^/]+\/)\s*(.*)$/)
  if (meaningPhonetic) {
    meaning = meaningPhonetic[3] || meaning
    if (!phonetic) phonetic = meaningPhonetic[2]
  }
  const posClean = (pos || 'n').replace(/\s*[.,]\s*/, ' ').trim().split(/\s+/)[0].replace(/\.$/, '')
  const posMap = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction' }
  return {
    word: word.replace(/\s+/g, ' ').trim(),
    partOfSpeech: posMap[posClean.toLowerCase()] || posClean.toLowerCase() || 'noun',
    phonetic: (phonetic && phonetic.startsWith('/')) ? phonetic.trim() : (phonetic ? `/${phonetic}/` : ''),
    meaning: meaning.replace(/\s+/g, ' ').trim(),
  }
}

function detectTopic(line) {
  if (isTableHeader(line)) return null
  const t = line.trim()
  if (t.length < 2 || t.length > 80) return null
  if (/^[\d\s./-]+$/.test(t)) return null
  if (t.includes('/') && t.match(/\/[^/]+\//)) return null
  for (const re of TOPIC_PATTERNS) {
    const m = t.match(re)
    if (m) return (m[1] || m[0]).trim()
  }
  return null
}

function parseVocabLine(line) {
  const t = line.trim()
  if (!t || t.length < 3) return null

  let word = ''
  let partOfSpeech = 'noun'
  let phonetic = ''
  let meaning = ''

  const withPos = t.match(VOCAB_WITH_PHONETIC)
  if (withPos) {
    word = withPos[1].trim()
    partOfSpeech = withPos[2]?.toLowerCase() || 'noun'
    const rawPhonetic = withPos[3]?.trim() || ''
    phonetic = rawPhonetic && /\/.+\//.test(rawPhonetic) ? rawPhonetic : (rawPhonetic ? `/${rawPhonetic}/` : '')
    meaning = withPos[4]?.trim() || ''
  } else {
    const withDash = t.match(VOCAB_WITH_DASH)
    if (withDash) {
      word = withDash[1].trim()
      meaning = withDash[2].trim()
    } else {
      const withSpaces = t.match(VOCAB_TAB_OR_SPACES)
      if (withSpaces) {
        word = withSpaces[1].trim()
        meaning = withSpaces[2].trim()
      } else {
        const parts = t.split(/\s{2,}|\t/)
        if (parts.length >= 2) {
          word = parts[0].trim()
          meaning = parts.slice(1).join(' ').trim()
        } else {
          return null
        }
      }
    }
  }

  if (!word || !meaning) return null
  if (word.length > 80 || meaning.length > 200) return null
  if (PHONETIC_ONLY.test(word)) return null

  const posMap = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction' }
  const pos = posMap[partOfSpeech] || partOfSpeech

  return {
    word: word.replace(/\s+/g, ' ').trim(),
    partOfSpeech: pos,
    phonetic: phonetic || '',
    meaning: meaning.replace(/\s+/g, ' ').trim(),
  }
}

function isLikelyVocabLine(line) {
  const t = line.trim()
  if (t.length < 4) return false
  if (/^[\d.]+\s*$/.test(t)) return false
  if (t.startsWith('#')) return false
  return true
}

function splitIntoTopics(fullText) {
  const lines = fullText.split(/\r?\n/).map((l) => l.trim())
  const sections = []
  let currentTopic = null
  let currentLines = []

  for (const line of lines) {
    const topicName = detectTopic(line)
    if (topicName) {
      if (currentTopic && currentLines.length > 0) {
        sections.push({ topic: currentTopic, lines: currentLines })
      }
      currentTopic = topicName
      currentLines = []
      continue
    }
    if (currentTopic) {
      currentLines.push(line)
    } else if (isLikelyVocabLine(line)) {
      currentTopic = 'Vocabulary'
      currentLines = [line]
    }
  }
  if (currentTopic && currentLines.length > 0) {
    sections.push({ topic: currentTopic, lines: currentLines })
  }
  return sections
}

function sectionToVocabs(section) {
  const vocabs = []
  for (const line of section.lines) {
    const v = parseTableRow(line) || parseVocabLine(line)
    if (v) {
      if (!v.phonetic) v.phonetic = ''
      vocabs.push(v)
    }
  }
  return vocabs
}

/** Extract vocabs when PDF is table format (has "STT  Từ vựng  Loại từ..." header). Returns { topicName, vocabs } or null. */
function extractTableFormat(fullText, pdfFileName) {
  const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.some((l) => isTableHeader(l))) return null
  const vocabs = []
  for (const line of lines) {
    if (isTableHeader(line)) continue
    const v = parseTableRow(line)
    if (v) vocabs.push(v)
  }
  const topicName = pdfFileName
    ? pdfFileName.replace(/\.pdf$/i, '').replace(/\s*-\s*$/, '').trim()
    : 'Vocabulary'
  return vocabs.length ? { topicName, vocabs } : null
}

async function findPdfPath() {
  const dataDir = join(rootDir, 'src', 'data')
  const dirs = await readdir(dataDir, { withFileTypes: true })
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    const sub = join(dataDir, d.name)
    const files = await readdir(sub, { withFileTypes: true })
    const pdf = files.find((f) => f.isFile() && f.name.toLowerCase().endsWith('.pdf'))
    if (pdf) return join(sub, pdf.name)
  }
  return null
}

async function main() {
  let pdfPath = process.argv[2]
  if (!pdfPath) {
    pdfPath = await findPdfPath()
    if (!pdfPath) {
      console.error('No PDF path given and no PDF found in src/data/*/')
      console.error('Usage: node scripts/extract-vocab-from-pdf.mjs [path-to.pdf]')
      process.exit(1)
    }
    console.log('Using PDF:', pdfPath)
  }

  const pdfDir = dirname(pdfPath)
  const buffer = await readFile(pdfPath)

  let PDFParse
  try {
    const mod = await import('pdf-parse')
    PDFParse = mod.PDFParse
  } catch (e) {
    console.error('Install pdf-parse first: npm install pdf-parse')
    process.exit(1)
  }

  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()

  const text = result?.text || ''
  if (!text) {
    console.error('No text extracted from PDF')
    process.exit(1)
  }

  const pdfFileName = basename(pdfPath, '.pdf')
  const tableResult = extractTableFormat(text, pdfFileName)
  if (tableResult) {
    const { topicName, vocabs } = tableResult
    const slug = slugify(topicName) || 'vocabulary'
    const outPath = join(pdfDir, `${slug}.json`)
    const payload = {
      topic: topicName,
      vocabs: vocabs.map((v) => ({
        word: v.word,
        partOfSpeech: v.partOfSpeech,
        phonetic: v.phonetic || '',
        meaning: v.meaning,
        exampleSentences: [],
      })),
    }
    await writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8')
    console.log('Table format detected. Wrote', vocabs.length, 'words ->', outPath)
    return
  }

  const sections = splitIntoTopics(text)
  console.log('Detected', sections.length, 'topic(s)')

  let totalWords = 0
  for (const section of sections) {
    if (isTableHeader(section.topic)) continue
    const vocabs = sectionToVocabs(section)
    if (vocabs.length === 0) continue
    const topicName = section.topic
    const slug = slugify(topicName)
    if (!slug) continue
    const outPath = join(pdfDir, `${slug}.json`)
    const payload = {
      topic: topicName,
      vocabs: vocabs.map((v) => ({
        word: v.word,
        partOfSpeech: v.partOfSpeech,
        phonetic: v.phonetic || '',
        meaning: v.meaning,
        exampleSentences: [],
      })),
    }
    await writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8')
    console.log('  ', topicName, '->', outPath, '(', vocabs.length, 'words)')
    totalWords += vocabs.length
  }

  console.log('Done. Total words:', totalWords)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
