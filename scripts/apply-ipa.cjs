/**
 * Apply learner-friendly IPA from ipa-map.json to all topic vocab files.
 * Run from project root: node scripts/apply-ipa.cjs
 */
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'src', 'data')
const MAP_PATH = path.join(__dirname, 'ipa-map.json')

const ipaMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'))

// Normalize key: lowercase, trim (map keys are already lowercase in our JSON)
function mapKey(word) {
  return word.trim().toLowerCase()
}

const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))
let totalApplied = 0
let totalSkipped = 0

for (const file of files) {
  const filePath = path.join(DATA_DIR, file)
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)
  if (!data.vocabs || !Array.isArray(data.vocabs)) continue

  let changed = false
  for (const v of data.vocabs) {
    const key = mapKey(v.word)
    const ipa = ipaMap[key]
    if (ipa) {
      v.phonetic = ipa
      changed = true
      totalApplied++
    } else {
      totalSkipped++
      // Normalize existing: ensure wrapped in slashes, trim
      if (typeof v.phonetic === 'string') {
        let p = v.phonetic.trim()
        if (!p.startsWith('/')) p = '/' + p
        if (!p.endsWith('/')) p = p + '/'
        if (p !== v.phonetic) {
          v.phonetic = p
          changed = true
        }
      }
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    console.log('Updated:', file)
  }
}

console.log('Done. Applied IPA map to', totalApplied, 'words. Kept existing for', totalSkipped, 'words.')
