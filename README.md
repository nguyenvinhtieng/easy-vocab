# Easy Vocab

A Vue.js application for learning English vocabulary using local JSON data.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or the URL shown in the terminal).

## Build

```bash
npm run build
npm run preview   # preview production build
```

## Data

Vocabulary is loaded from JSON files in `src/data/`. Each file should follow this structure:

```json
{
  "topic": "Topic Name",
  "vocabs": [
    {
      "word": "mouse",
      "partOfSpeech": "noun",
      "phonetic": "/maʊs/",
      "meaning": "con chuột",
      "exampleSentences": [
        "A mouse ran across the floor."
      ]
    }
  ]
}
```

- `partOfSpeech` can be a string or array of strings (e.g. `["noun", "adjective"]`).
- Add new topics by creating a new `.json` file in `src/data/`. The filename (without `.json`) is used as the topic id.

## Features

- **Topic list** – Choose a topic to start learning.
- **Flashcards** – Word, image, phonetic, part of speech; flip to see meaning and examples.
- **Text-to-speech** – Pronounce the word (browser TTS).
- **Learn / Skip** – “Learn this word” adds to “words to learn”; “I already know” skips.
- **Type check** – After flipping, type the word to verify (✔/✖).
- **Words to learn** – Stored in LocalStorage; review from the “Review words to learn” entry.
- **Import/Export** – Export “words to learn” to JSON or import from a JSON file.

## Tech

- Vue 3 (Composition API), Vue Router, Pinia, TypeScript, Vite.
