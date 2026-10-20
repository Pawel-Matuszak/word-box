import type { Progress } from './types'

/** Leitner boxes. Box 0 = never seen. A correct answer moves a card up one box, a miss sends it back to box 1. */
export const BOXES = [
  { box: 0, label: 'New', days: 0 },
  { box: 1, label: 'Daily', days: 1 },
  { box: 2, label: '3 days', days: 3 },
  { box: 3, label: 'Weekly', days: 7 },
  { box: 4, label: '2 weeks', days: 14 },
  { box: 5, label: 'Monthly', days: 30 },
] as const

export const MAX_BOX = 5
const DAY = 24 * 60 * 60 * 1000

function startOfDay(t: number) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function review(prev: Progress | undefined, wordId: number, user: string, correct: boolean, now = Date.now()): Progress {
  const base = prev ?? { word_id: wordId, user, box: 0, due: 0, correct: 0, wrong: 0, last_seen: 0 }
  const box = correct ? Math.min(MAX_BOX, base.box + 1) : 1
  return {
    ...base,
    box,
    // A miss stays due today; a hit waits for the box's interval, counted from midnight so the time of day doesn't drift.
    due: correct ? startOfDay(now) + BOXES[box].days * DAY : now,
    correct: base.correct + (correct ? 1 : 0),
    wrong: base.wrong + (correct ? 0 : 1),
    last_seen: now,
  }
}

export function isDue(p: Progress | undefined, now = Date.now()) {
  return !p || p.box === 0 || p.due <= now
}

export function isToday(t: number, now = Date.now()) {
  return t >= startOfDay(now)
}
