import { signal } from '@preact/signals'
import type { ComponentChildren } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { type Direction, Flashcard, IndexCard } from '../components/cards'
import { Button, Header, Icon, Segmented, shuffle } from '../components/ui'
import { go } from '../router'
import { type AnsweredCard, duePool, pool, recordAnswer, undoAnswer } from '../store'
import type { Word } from '../types'

const SESSION_SIZE = 20
const direction = signal<Direction>('pl-en')
/** How far a card has to be dragged before letting go counts as an answer. */
const SWIPE_PX = 60
/** A quick flick counts too, even if it is short: px per ms, and the least distance it must still cover. */
const FLICK_SPEED = 0.35
const FLICK_PX = 20

/** One answer in this session, with what it changed so it can be taken back. */
type Step = { answered: AnsweredCard; counted: boolean; requeued: boolean }

export function Study() {
  const [practice, setPractice] = useState(false)
  // Freeze the deck when the session starts, so answering doesn't reshuffle it underneath you.
  const initial = useMemo(() => shuffle(duePool.value.length && !practice ? duePool.value : pool.value).slice(0, SESSION_SIZE), [practice])
  const [deck, setDeck] = useState<Word[]>(initial)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [missed] = useState(() => new Set<number>())
  const [history, setHistory] = useState<Step[]>([])

  useEffect(() => {
    setDeck(initial)
    setIndex(0)
    setKnown(0)
    setHistory([])
    missed.clear()
  }, [initial])

  const card = deck[index]
  const firstPassTotal = initial.length

  function answer(correct: boolean) {
    if (!card) return
    const answered = recordAnswer(card.id, correct)
    const first = !missed.has(card.id)
    if (correct) {
      if (first) setKnown((k) => k + 1)
    } else if (first) {
      // Missed cards come back once at the end of the session.
      missed.add(card.id)
      setDeck((d) => [...d, card])
    }
    setHistory((h) => [...h, { answered, counted: correct && first, requeued: !correct && first }])
    setFlipped(false)
    setIndex((i) => i + 1)
  }

  const swipe = useSwipe(answer)

  function undo() {
    const step = history[history.length - 1]
    if (!step || swipe.leaving) return
    undoAnswer(step.answered)
    if (step.counted) setKnown((k) => k - 1)
    if (step.requeued) {
      // Steps are undone newest first, so the card it put back is still the last one in the deck.
      missed.delete(step.answered.wordId)
      setDeck((d) => d.slice(0, -1))
    }
    setHistory((h) => h.slice(0, -1))
    setFlipped(false)
    setIndex((i) => i - 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key === 'Backspace' || e.key === 'z') undo()
      else if (!card) return
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowLeft' || e.key === '1') swipe.fling(-1)
      else if (e.key === 'ArrowRight' || e.key === '2') swipe.fling(1)
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
          <UndoButton onClick={undo} disabled={!history.length} class="justify-self-center" />
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
            { value: 'pl-en', label: 'Polish → English' },
            { value: 'en-pl', label: 'English → Polish' },
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
          {/* touch-none: if the browser may pan, Safari grabs any slightly diagonal drag, cancels the swipe and scrolls the page. */}
          <div {...swipe.bind} class="relative touch-none select-none" style={swipe.style}>
            <Flashcard word={card} dir={direction.value} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
            <Stamp opacity={-swipe.pull} class="right-4 rotate-[8deg] border-berry text-berry">
              Again
            </Stamp>
            <Stamp opacity={swipe.pull} class="left-4 -rotate-[8deg] border-leaf text-leaf">
              Knew it
            </Stamp>
          </div>
        </div>
      </div>

      <div class="mt-5 flex items-center justify-between gap-2 text-sm font-semibold">
        <button type="button" onClick={() => swipe.fling(-1)} class="rounded-full px-3 py-2 text-berry transition active:scale-95">
          ← Again
        </button>
        <UndoButton onClick={undo} disabled={!history.length} />
        <button type="button" onClick={() => swipe.fling(1)} class="rounded-full px-3 py-2 text-leaf transition active:scale-95">
          Knew it →
        </button>
      </div>
      <p class="mt-2 text-center text-sm text-ink-soft">
        {flipped ? 'Swipe right if you knew it, left to see it again.' : 'Say it out loud, then turn the card over.'}
      </p>
    </>
  )
}

function UndoButton({ onClick, disabled, class: cls = '' }: { onClick: () => void; disabled: boolean; class?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      class={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-ink-soft ring-1 ring-hairline transition hover:text-ink active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${cls}`}
    >
      <Icon.undo class="size-4" />
      Undo
    </button>
  )
}

/** "Again" / "Knew it" label that fades in on the card as it is dragged. */
function Stamp({ opacity, class: cls, children }: { opacity: number; class: string; children: ComponentChildren }) {
  if (opacity <= 0) return null
  return (
    <span
      class={`pointer-events-none absolute top-16 rounded-xl border-[3px] bg-card/85 px-3 py-1 text-xl font-extrabold tracking-wide uppercase ${cls}`}
      style={{ opacity: Math.min(1, opacity) }}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}

/**
 * Drag a card sideways to answer: right is "knew it", left is "again".
 * `pull` runs from -1 to 1 as the card nears the answer threshold; `fling` throws it off screen.
 */
function useSwipe(onSwipe: (correct: boolean) => void) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<-1 | 0 | 1>(0)
  const start = useRef<{ id: number; x: number; y: number } | null>(null)
  const moved = useRef(false)
  const offset = useRef(0)
  // Speed of the drag in px/ms, smoothed over the last few moves, so a flick can count.
  const velocity = useRef(0)
  const last = useRef({ x: 0, t: 0 })

  function move(x: number) {
    offset.current = x
    setDx(x)
  }

  function fling(dir: -1 | 1) {
    if (leaving) return
    setDragging(false)
    setLeaving(dir)
    setTimeout(() => {
      setLeaving(0)
      move(0)
      onSwipe(dir === 1)
    }, 220)
  }

  function release(e: PointerEvent) {
    if (!start.current || start.current.id !== e.pointerId) return
    start.current = null
    setDragging(false)
    const x = offset.current
    // A flick only counts if the card was still heading that way when the finger lifted.
    const flicked = Math.abs(x) > FLICK_PX && Math.abs(velocity.current) > FLICK_SPEED && Math.sign(velocity.current) === Math.sign(x)
    if (e.type === 'pointerup' && moved.current && (Math.abs(x) > SWIPE_PX || flicked)) fling(x > 0 ? 1 : -1)
    else move(0)
  }

  const x = leaving ? leaving * (window.innerWidth + 200) : dx
  return {
    leaving,
    fling,
    pull: leaving || dx / SWIPE_PX,
    style: {
      transform: `translateX(${x}px) rotate(${x / 18}deg)`,
      transition: dragging ? 'none' : 'transform 0.22s ease-out',
    },
    bind: {
      onPointerDown: (e: PointerEvent) => {
        if (leaving || e.button > 0) return
        start.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
        moved.current = false
        velocity.current = 0
        last.current = { x: e.clientX, t: e.timeStamp }
      },
      onPointerMove: (e: PointerEvent) => {
        const s = start.current
        if (!s || s.id !== e.pointerId) return
        const ddx = e.clientX - s.x
        const dt = e.timeStamp - last.current.t
        if (dt > 0) velocity.current = 0.6 * ((e.clientX - last.current.x) / dt) + 0.4 * velocity.current
        last.current = { x: e.clientX, t: e.timeStamp }
        if (!moved.current) {
          // Anything past a small wobble is a drag, at any angle; only the sideways part moves the card.
          if (Math.hypot(ddx, e.clientY - s.y) < 6) return
          moved.current = true
          setDragging(true)
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }
        move(ddx)
      },
      onPointerUp: release,
      onPointerCancel: release,
      // A drag ends in a click on the card; don't let it turn the card over.
      onClickCapture: (e: MouseEvent) => {
        if (!moved.current) return
        moved.current = false
        e.stopPropagation()
        e.preventDefault()
      },
    },
  }
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
