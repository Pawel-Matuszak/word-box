import { computed, effect, signal } from '@preact/signals'
import { api, fetchBootstrap } from './api'
import { isDue, review } from './srs'
import type { Bootstrap, Progress, Word, WordInput } from './types'

// ---------- persistence ----------

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: the app still works for this session */
  }
}

const cached = load<Bootstrap | null>('wb:data', null)

// ---------- state ----------

export const words = signal<Word[]>(cached?.words ?? [])
export const levels = signal<string[]>(cached?.levels ?? [])
export const owners = signal<string[]>(cached?.owners ?? [])
const serverProgress = signal<Progress[]>(cached?.progress ?? [])
/** Reviews not yet confirmed by the server, keyed by `${word_id}|${user}`. */
export const queue = signal<Record<string, Progress>>(load('wb:queue', {}))

export const profile = signal<string>(load('wb:profile', ''))
export const writeKey = signal<string>(load('wb:key', ''))
/** Whose words to practise: 'mine', 'all', or an owner name. */
export const ownerFilter = signal<string>(load('wb:ownerFilter', 'mine'))

export const loading = signal(!cached)
export const syncError = signal('')
export const lastSynced = signal<number>(load('wb:lastSynced', 0))
export const online = signal(typeof navigator === 'undefined' ? true : navigator.onLine)

effect(() => save('wb:queue', queue.value))
effect(() => save('wb:profile', profile.value))
effect(() => save('wb:key', writeKey.value))
effect(() => save('wb:ownerFilter', ownerFilter.value))

function persistData() {
  save('wb:data', {
    words: words.value,
    levels: levels.value,
    owners: owners.value,
    progress: serverProgress.value,
  } satisfies Bootstrap)
}

const pkey = (wordId: number, user: string) => `${wordId}|${user}`

// ---------- derived ----------

/** Progress for the current profile, with unsynced reviews on top of what the server knows. */
export const myProgress = computed(() => {
  const map = new Map<number, Progress>()
  for (const p of serverProgress.value) if (p.user === profile.value) map.set(p.word_id, p)
  for (const p of Object.values(queue.value)) if (p.user === profile.value) map.set(p.word_id, p)
  return map
})

export const pool = computed(() => {
  const f = ownerFilter.value
  if (f === 'all') return words.value
  const who = f === 'mine' ? profile.value : f
  return words.value.filter((w) => w.owner === who)
})

export const duePool = computed(() => {
  const now = Date.now()
  const prog = myProgress.value
  return pool.value.filter((w) => isDue(prog.get(w.id), now))
})

export const pendingCount = computed(() => Object.keys(queue.value).length)

// ---------- sync ----------

export async function refresh() {
  try {
    const data = await fetchBootstrap()
    words.value = data.words
    levels.value = data.levels
    owners.value = data.owners
    // A bootstrap read can race an upload, so never let an older server row replace a newer one we already sent.
    const merged = new Map(data.progress.map((p) => [pkey(p.word_id, p.user), p]))
    for (const p of serverProgress.value) {
      const k = pkey(p.word_id, p.user)
      if (p.last_seen > (merged.get(k)?.last_seen ?? 0)) merged.set(k, p)
    }
    serverProgress.value = [...merged.values()]
    lastSynced.value = Date.now()
    save('wb:lastSynced', lastSynced.value)
    syncError.value = ''
    persistData()
  } catch (e) {
    syncError.value = online.value ? errorText(e) : 'You are offline. Showing saved words.'
  } finally {
    loading.value = false
  }
}

let flushing = false
let flushTimer: ReturnType<typeof setTimeout> | undefined

export async function flushQueue() {
  const pending = Object.values(queue.value)
  if (flushing || !pending.length || !writeKey.value || !online.value) return
  flushing = true
  try {
    await api.recordReviews(writeKey.value, pending)
    // Keep anything reviewed while the request was in flight.
    const next = { ...queue.value }
    const merged = new Map(serverProgress.value.map((p) => [pkey(p.word_id, p.user), p]))
    for (const p of pending) {
      const k = pkey(p.word_id, p.user)
      merged.set(k, p)
      if (next[k]?.last_seen === p.last_seen) delete next[k]
    }
    serverProgress.value = [...merged.values()]
    queue.value = next
    persistData()
    syncError.value = ''
  } catch (e) {
    syncError.value = errorText(e)
  } finally {
    flushing = false
  }
}

function scheduleFlush() {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(flushQueue, 2500)
}

const todayKey = () => new Date().toDateString()
type Tally = { day: string; user: string; reviewed: number; known: number }
const tally = signal<Tally>(load('wb:tally', { day: '', user: '', reviewed: 0, known: 0 }))
effect(() => save('wb:tally', tally.value))

/** Answers given today by the current profile on this device. */
export const todayTally = computed(() => {
  const t = tally.value
  return t.day === todayKey() && t.user === profile.value ? t : { reviewed: 0, known: 0 }
})

export function recordAnswer(wordId: number, correct: boolean) {
  const next = review(myProgress.value.get(wordId), wordId, profile.value, correct)
  queue.value = { ...queue.value, [pkey(wordId, profile.value)]: next }
  const t = todayTally.value
  tally.value = { day: todayKey(), user: profile.value, reviewed: t.reviewed + 1, known: t.known + (correct ? 1 : 0) }
  scheduleFlush()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online.value = true
    flushQueue()
    refresh()
  })
  window.addEventListener('offline', () => (online.value = false))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushQueue()
  })
}

// ---------- word edits (online + key only) ----------

function requireWrite() {
  if (!online.value) throw new Error('You are offline. Connect to the internet to change words.')
  if (!writeKey.value) throw new Error('Add your write key in Settings to change words.')
  return writeKey.value
}

export async function addWord(input: WordInput) {
  const word = await api.addWord(requireWrite(), input)
  words.value = [...words.value, word]
  persistData()
  return word
}

export async function updateWord(word: Word) {
  const saved = await api.updateWord(requireWrite(), word)
  words.value = words.value.map((w) => (w.id === saved.id ? saved : w))
  persistData()
  return saved
}

export async function deleteWord(id: number) {
  await api.deleteWord(requireWrite(), id)
  words.value = words.value.filter((w) => w.id !== id)
  serverProgress.value = serverProgress.value.filter((p) => p.word_id !== id)
  queue.value = Object.fromEntries(Object.entries(queue.value).filter(([, p]) => p.word_id !== id))
  persistData()
}

export function errorText(e: unknown) {
  if (e instanceof TypeError) return 'Could not reach the server. Check your connection.'
  return e instanceof Error ? e.message : String(e)
}
