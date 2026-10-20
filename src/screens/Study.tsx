import { signal } from '@preact/signals'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { type Direction, Flashcard, IndexCard } from '../components/cards'
import { Button, Header, Icon, Segmented, shuffle } from '../components/ui'
import { go } from '../router'
import { duePool, pool, recordAnswer } from '../store'
import type { Word } from '../types'

const SESSION_SIZE = 20
const direction = signal<Direction>('en-pl')

export function Study() {
  const [practice, setPractice] = useState(false)
  // Freeze the deck when the session starts, so answering doesn't reshuffle it underneath you.
  const initial = useMemo(() => shuffle(duePool.value.length && !practice ? duePool.value : pool.value).slice(0, SESSION_SIZE), [practice])
  const [deck, setDeck] = useState<Word[]>(initial)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [missed] = useState(() => new Set<number>())

  useEffect(() => {
    setDeck(initial)
    setIndex(0)
    setKnown(0)
    missed.clear()
  }, [initial])

  const card = deck[index]
  const firstPassTotal = initial.length

  function answer(correct: boolean) {
    if (!card) return
    recordAnswer(card.id, correct)
    if (correct) {
      if (!missed.has(card.id)) setKnown((k) => k + 1)
    } else if (!missed.has(card.id)) {
      // Missed cards come back once at the end of the session.
      missed.add(card.id)
      setDeck((d) => [...d, card])
    }
    setFlipped(false)
    setIndex((i) => i + 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (flipped && (e.key === 'ArrowLeft' || e.key === '1')) answer(false)
      else if (flipped && (e.key === 'ArrowRight' || e.key === '2')) answer(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!initial.length) {
    return (
      <>
        <Header title="Study" back />
        <EmptyBox />
      </>
    )
  }

  if (!card) {
    return (
      <>
        <Header title="Study" back />
        <IndexCard class="deal-in mt-4" head={<span class="text-sm font-semibold text-ink-soft">Session done</span>}>
          <p class="hand pb-2 text-[2.4rem] leading-[4rem] font-bold text-pen">
            {known} of {firstPassTotal} known first time
          </p>
          <p class="hand pb-6 text-[1.4rem] text-ink">
            {missed.size ? `${missed.size} card${missed.size === 1 ? '' : 's'} went back to the Daily box.` : 'Not a single miss. Nicely done!'}
          </p>
        </IndexCard>
        <div class="mt-6 grid gap-3">
          <Button onClick={() => go('home')}>Back to my box</Button>
          <Button variant="ghost" onClick={() => setPractice((p) => !p)}>
            Study another round
          </Button>
        </div>
      </>
    )
  }

  const remaining = deck.length - index
  return (
    <>
      <Header
        title="Study"
        back
        action={<span class="text-sm font-semibold text-ink-soft tabular-nums">{remaining} left</span>}
      />
      <div class="mb-4">
        <Segmented
          label="Direction"
          value={direction.value}
          onChange={(v) => {
            direction.value = v
            setFlipped(false)
          }}
          options={[
            { value: 'en-pl', label: 'English → Polish' },
            { value: 'pl-en', label: 'Polish → English' },
          ]}
        />
      </div>

      <div class="h-1.5 overflow-hidden rounded-full bg-hairline" role="progressbar" aria-valuemin={0} aria-valuemax={deck.length} aria-valuenow={index}>
        <div class="h-full rounded-full bg-pen transition-[width] duration-300" style={{ width: `${(index / deck.length) * 100}%` }} />
      </div>

      {/* A peek of the pile behind the current card */}
      <div class="relative mt-6">
        {remaining > 1 && <div class="index-card plain absolute inset-x-3 -top-2 h-24 rotate-[1.5deg] rounded-[14px] opacity-70" />}
        <div key={`${card.id}-${index}`} class="deal-in relative">
          <Flashcard word={card} dir={direction.value} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
        </div>
      </div>

      <div class={`mt-6 grid grid-cols-2 gap-3 transition ${flipped ? '' : 'pointer-events-none opacity-0'}`} aria-hidden={!flipped}>
        <button type="button" onClick={() => answer(false)} tabIndex={flipped ? 0 : -1} class="min-h-14 rounded-2xl bg-berry-soft text-lg font-bold text-berry transition active:scale-[.98]">
          Again
        </button>
        <button type="button" onClick={() => answer(true)} tabIndex={flipped ? 0 : -1} class="min-h-14 rounded-2xl bg-leaf-soft text-lg font-bold text-leaf transition active:scale-[.98]">
          Knew it
        </button>
      </div>
      {!flipped && <p class="-mt-10 text-center text-sm text-ink-soft">Say it out loud, then turn the card over.</p>}
    </>
  )
}

export function EmptyBox() {
  return (
    <div class="mt-10 text-center">
      <Icon.box class="mx-auto size-14 text-ink-soft/60" />
      <p class="mt-4 text-lg font-semibold">No words in this box yet</p>
      <p class="mt-1 text-ink-soft">Add some words, or switch to someone else's words on the home screen.</p>
      <Button class="mt-6" onClick={() => go('words')}>
        Add words
      </Button>
    </div>
  )
}
