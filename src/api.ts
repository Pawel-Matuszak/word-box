import type { Bootstrap, Progress, Word, WordInput } from './types'
import { demoData } from './demo'

const API_URL = import.meta.env.VITE_API_URL as string | undefined

export const isDemo = !API_URL

interface Envelope<T> {
  ok: boolean
  data?: T
  error?: string
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Server answered ${res.status}`)
  const body = (await res.json()) as Envelope<T>
  if (!body.ok) throw new Error(body.error || 'Unknown server error')
  return body.data as T
}

export async function fetchBootstrap(): Promise<Bootstrap> {
  if (isDemo) return structuredClone(demoData)
  return unwrap<Bootstrap>(await fetch(`${API_URL}?action=bootstrap`))
}

async function post<T>(key: string, action: string, payload: unknown = {}): Promise<T> {
  // text/plain keeps this a "simple" request, so Apps Script doesn't need to answer a CORS preflight.
  const res = await fetch(API_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ key, action, payload }),
  })
  return unwrap<T>(res)
}

let demoId = 1000

export const api = {
  checkKey: (key: string) => (isDemo ? Promise.resolve(true) : post<boolean>(key, 'checkKey')),
  addWord: (key: string, w: WordInput) =>
    isDemo ? Promise.resolve({ ...w, id: ++demoId }) : post<Word>(key, 'addWord', w),
  updateWord: (key: string, w: Word) => (isDemo ? Promise.resolve(w) : post<Word>(key, 'updateWord', w)),
  deleteWord: (key: string, id: number) =>
    isDemo ? Promise.resolve({ id }) : post<{ id: number }>(key, 'deleteWord', { id }),
  recordReviews: (key: string, reviews: Progress[]) =>
    isDemo ? Promise.resolve({ saved: reviews.length }) : post<{ saved: number }>(key, 'recordReviews', { reviews }),
}
