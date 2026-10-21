export interface Word {
  id: number
  word: string
  translation: string
  level: string
  owner: string
  /** Topic the word belongs to; '' when it has none. */
  category: string
  notes: string
  example_pl: string
  example_en: string
}

export type WordInput = Omit<Word, 'id'>

export interface Progress {
  word_id: number
  user: string
  box: number
  due: number
  correct: number
  wrong: number
  last_seen: number
}

export interface Bootstrap {
  words: Word[]
  levels: string[]
  owners: string[]
  categories: string[]
  progress: Progress[]
}
