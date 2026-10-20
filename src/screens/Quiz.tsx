import { signal } from '@preact/signals'
import { useEffect, useRef, useState } from 'preact/hooks'
import { answer as answerOf, type Direction, IndexCard, prompt } from '../components/cards'
import { Button, buttonClass, Header, inputClass, LevelChip, Segmented, shuffle } from '../components/ui'
import { go } from '../router'
import { pool, recordAnswer } from '../store'
import type { Word } from '../types'
import { EmptyBox } from './Study'

type Mode = 'choose' | 'type'
const settings = signal<{ dir: Direction; mode: Mode; length: '10' | '20' }>({ dir: 'en-pl', mode: 'choose', length: '10' })

interface Result {
  word: Word
  given: string
  correct: boolean
}

export function Quiz() {
  const [questions, setQuestions] = useState<Word[] | null>(null)
  const [results, setResults] = useState<Result[]>([])

  if (pool.value.length < 2) {
    return (
      <>
        <Header title="Quiz" back />
        <EmptyBox />
      </>
    )
  }

  if (!questions) {
    const s = settings.value
    const set = (patch: Partial<typeof s>) => (settings.value = { ...s, ...patch })
    return (
      <>
        <Header title="Quiz" back />
        <IndexCard head={<span class="text-sm font-semibold text-ink-soft">How it works</span>} class="mb-6">
          <p class="hand pb-4 text-[1.45rem] text-ink">
            Answer {s.length} questions from your box. Every answer counts towards your progress, just like studying.
          </p>
        </IndexCard>
        <div class="grid gap-5">
          <Setting label="Direction">
            <Segmented label="Direction" value={s.dir} onChange={(dir) => set({ dir })} options={[{ value: 'en-pl', label: 'English → Polish' }, { value: 'pl-en', label: 'Polish → English' }]} />
          </Setting>
          <Setting label="Answer by">
            <Segmented label="Answer by" value={s.mode} onChange={(mode) => set({ mode })} options={[{ value: 'choose', label: 'Choosing' }, { value: 'type', label: 'Typing' }]} />
          </Setting>
          <Setting label="Questions">
            <Segmented label="Questions" value={s.length} onChange={(length) => set({ length })} options={[{ value: '10', label: '10' }, { value: '20', label: '20' }]} />
          </Setting>
        </div>
        <Button
          class="mt-8 w-full"
          onClick={() => {
            setResults([])
            setQuestions(shuffle(pool.value).slice(0, Number(s.length)))
          }}
        >
          Start quiz
        </Button>
      </>
    )
  }

  if (results.length === questions.length) {
    return <Score results={results} onAgain={() => setQuestions(null)} />
  }

  const word = questions[results.length]
  return (
    <>
      <Header title="Quiz" back action={<span class="text-sm font-semibold text-ink-soft tabular-nums">{results.length + 1} / {questions.length}</span>} />
      <Question
        key={`${word.id}-${results.length}`}
        word={word}
        dir={settings.value.dir}
        mode={settings.value.mode}
        onDone={(r) => setResults((all) => [...all, r])}
      />
    </>
  )
}

function Setting({ label, children }: { label: string; children: preact.ComponentChildren }) {
  return (
    <div>
      <p class="mb-2 text-sm font-semibold">{label}</p>
      {children}
    </div>
  )
}

function Question({ word, dir, mode, onDone }: { word: Word; dir: Direction; mode: Mode; onDone: (r: Result) => void }) {
  const correctAnswer = answerOf(word, dir)
  const [given, setGiven] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const options = useRefOnce(() => {
    const others = shuffle(pool.value.filter((w) => w.id !== word.id && answerOf(w, dir) !== correctAnswer))
    // Prefer distractors from the same level: they're harder to rule out.
    others.sort((a, b) => Number(b.level === word.level) - Number(a.level === word.level))
    return shuffle([correctAnswer, ...others.slice(0, 3).map((w) => answerOf(w, dir))])
  })

  useEffect(() => {
    if (mode === 'type') inputRef.current?.focus()
  }, [])
  useEffect(() => {
    if (verdict) nextRef.current?.focus()
  }, [verdict])

  function submit(value: string) {
    if (verdict) return
    const v = mode === 'choose' ? (value === correctAnswer ? 'right' : 'wrong') : check(value, word, dir)
    setGiven(value)
    setVerdict(v)
    recordAnswer(word.id, v !== 'wrong')
  }

  return (
    <div class="deal-in">
      <IndexCard plain head={<><LevelChip level={word.level} /><span class="ml-auto text-xs font-medium text-ink-soft">{dir === 'en-pl' ? 'Translate into Polish' : 'Translate into English'}</span></>}>
        <p class="py-10 text-center text-[clamp(2rem,9vw,2.75rem)] leading-[1.05] font-extrabold tracking-tight text-balance break-words">{prompt(word, dir)}</p>
      </IndexCard>

      {mode === 'choose' ? (
        <div class="mt-5 grid gap-2.5">
          {options.map((o) => {
            const isRight = verdict && o === correctAnswer
            const isWrongPick = verdict && o === given && o !== correctAnswer
            return (
              <button
                type="button"
                disabled={!!verdict}
                onClick={() => submit(o)}
                class={`min-h-14 rounded-2xl px-5 text-left text-lg font-semibold transition ${
                  isRight ? 'bg-leaf-soft text-leaf ring-2 ring-leaf' : isWrongPick ? 'bg-berry-soft text-berry ring-2 ring-berry' : verdict ? 'bg-card text-ink-soft opacity-60' : 'bg-card shadow-card hover:bg-pen-soft active:scale-[.99]'
                }`}
              >
                {o}
              </button>
            )
          })}
        </div>
      ) : (
        <form
          class="mt-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (typed.trim()) submit(typed)
          }}
        >
          <input
            ref={inputRef}
            value={typed}
            onInput={(e) => setTyped(e.currentTarget.value)}
            disabled={!!verdict}
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            lang={dir === 'en-pl' ? 'pl' : 'en'}
            placeholder="Type the translation"
            aria-label="Your answer"
            class={`${inputClass} bg-card text-lg`}
          />
          {!verdict && (
            <div class="mt-3 grid grid-cols-[auto_1fr] gap-3">
              <Button variant="quiet" onClick={() => submit('')}>I don't know</Button>
              <Button type="submit" disabled={!typed.trim()}>Check</Button>
            </div>
          )}
        </form>
      )}

      {verdict && (
        <div class="deal-in mt-5" aria-live="polite">
          <p class={`hand text-[1.9rem] font-bold ${verdict === 'wrong' ? 'text-berry' : 'text-leaf'}`}>
            {verdict === 'right' ? 'Correct!' : verdict === 'almost' ? 'Almost! Mind the spelling:' : mode === 'type' && !given ? 'The answer is:' : 'Not quite. It’s:'}
            {verdict !== 'right' && <span class="ml-2 text-pen">{correctAnswer}</span>}
          </p>
          <button type="button" ref={nextRef} class={`${buttonClass()} mt-3 w-full`} onClick={() => onDone({ word, given: given ?? '', correct: verdict !== 'wrong' })}>
            Next question
          </button>
        </div>
      )}
    </div>
  )
}

function Score({ results, onAgain }: { results: Result[]; onAgain: () => void }) {
  const right = results.filter((r) => r.correct).length
  const missed = results.filter((r) => !r.correct)
  const ratio = right / results.length
  const remark = ratio === 1 ? 'Perfect score!' : ratio >= 0.8 ? 'Great work.' : ratio >= 0.5 ? 'Getting there.' : 'Worth another round.'
  return (
    <>
      <Header title="Quiz" back />
      <IndexCard head={<span class="text-sm font-semibold text-ink-soft">Your score</span>}>
        <div class="relative flex items-center gap-4 py-4">
          <div class="relative grid h-32 w-40 place-items-center">
            {/* A teacher's red-pen circle around the mark */}
            <svg viewBox="0 0 200 150" class="absolute inset-0 size-full text-margin" aria-hidden="true">
              <path class="draw" d="M150 22C116 4 44 10 22 50s4 86 64 92 104-20 106-66S150 10 98 14" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
            </svg>
            <span class="hand relative text-[3.4rem] leading-none font-bold text-margin tabular-nums">
              {right}/{results.length}
            </span>
          </div>
          <p class="hand text-[1.8rem] leading-tight text-ink">{remark}</p>
        </div>
      </IndexCard>

      {missed.length > 0 && (
        <section class="mt-6">
          <h2 class="mb-2 text-sm font-semibold">Words to look at again</h2>
          <ul class="divide-y divide-hairline overflow-hidden rounded-2xl bg-card ring-1 ring-hairline">
            {missed.map(({ word }) => (
              <li class="flex items-baseline gap-3 px-4 py-3">
                <span class="font-bold">{word.word}</span>
                <span class="hand ml-auto text-[1.35rem] leading-none text-pen">{word.translation}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div class="mt-6 grid gap-3">
        <Button onClick={onAgain}>New quiz</Button>
        <Button variant="ghost" onClick={() => go('home')}>Back to my box</Button>
      </div>
    </>
  )
}

// ---------- answer checking ----------

type Verdict = 'right' | 'almost' | 'wrong'

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.,!?;:"'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
const stripMarks = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

function accepted(w: Word, dir: Direction) {
  // "pragnienie, chęć" or "robe / gown" both count as several valid answers.
  return answerOf(w, dir).split(/[,/;]| or /).map(normalize).filter(Boolean)
}

function check(input: string, w: Word, dir: Direction): Verdict {
  const given = normalize(input)
  if (!given) return 'wrong'
  const ok = accepted(w, dir)
  if (ok.includes(given)) return 'right'
  const loose = stripMarks(given)
  if (ok.some((a) => stripMarks(a) === loose || distance(stripMarks(a), loose) <= (a.length > 6 ? 1 : 0))) return 'almost'
  return 'wrong'
}

function distance(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

function useRefOnce<T>(make: () => T): T {
  const ref = useRef<{ v: T } | null>(null)
  if (!ref.current) ref.current = { v: make() }
  return ref.current.v
}
