import type { ComponentChildren } from 'preact'
import { ownerFilter, owners, profile } from '../store'
import type { Word } from '../types'
import { Chip, LevelChip } from './ui'

export type Direction = 'en-pl' | 'pl-en'

export function prompt(w: Word, dir: Direction) {
  return dir === 'en-pl' ? w.word : w.translation
}
export function answer(w: Word, dir: Direction) {
  return dir === 'en-pl' ? w.translation : w.word
}

/** A ruled index card. `head` sits above the red line. */
export function IndexCard({ head, children, class: cls = '', plain }: { head?: ComponentChildren; children?: ComponentChildren; class?: string; plain?: boolean }) {
  return (
    <div class={`index-card ${plain ? 'plain' : ''} rounded-[14px] ${cls}`}>
      <div class="flex h-14 items-center gap-2 px-5">{head}</div>
      <div class="px-5 pt-[2px]">{children}</div>
    </div>
  )
}

/** Two-sided flashcard: tap to turn it over. */
export function Flashcard({ word, dir, flipped, onFlip }: { word: Word; dir: Direction; flipped: boolean; onFlip: () => void }) {
  const exampleFront = dir === 'en-pl' ? word.example_en : word.example_pl
  const exampleBack = dir === 'en-pl' ? word.example_pl : word.example_en
  const head = (
    <>
      <LevelChip level={word.level} />
      <span class="ml-auto text-xs font-medium text-ink-soft">{word.owner}</span>
    </>
  )
  return (
    <button
      type="button"
      onClick={onFlip}
      class="flip block w-full text-left"
      aria-label={flipped ? `Answer: ${answer(word, dir)}. Tap to turn back.` : `${prompt(word, dir)}. Tap to see the answer.`}
    >
      <div class={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
        <IndexCard head={head} plain class="flip-face min-h-[22rem]">
          <div class="flex min-h-[18rem] flex-col items-center justify-center pb-8 text-center">
            <p class="text-[clamp(2rem,9vw,3rem)] leading-[1.05] font-extrabold tracking-tight text-balance break-words">{prompt(word, dir)}</p>
            {exampleFront && <p class="mt-5 max-w-[28ch] text-[15px] leading-relaxed text-ink-soft">{highlight(exampleFront, prompt(word, dir))}</p>}
            <p class="mt-8 text-sm font-medium text-pen">Tap to turn over</p>
          </div>
        </IndexCard>
        <IndexCard head={head} class="flip-face flip-back">
          <div class="pb-6">
            {/* Two ruled lines tall, with the baseline sitting on the second rule */}
            <p class="hand pt-[1.6rem] pb-[0.4rem] text-[2.6rem] !leading-[2rem] font-bold text-pen break-words">{answer(word, dir)}</p>
            {exampleBack && <p class="hand text-[1.45rem] text-ink">{exampleBack}</p>}
            {exampleFront && <p class="hand text-[1.3rem] text-ink-soft">{exampleFront}</p>}
            {word.notes && <p class="hand text-[1.3rem] text-margin">{word.notes}</p>}
          </div>
        </IndexCard>
      </div>
    </button>
  )
}

/** Underline the studied word inside its example sentence when it appears verbatim. */
function highlight(sentence: string, term: string) {
  const stem = term.length > 4 ? term.slice(0, Math.max(4, term.length - 2)) : term
  const i = sentence.toLowerCase().indexOf(stem.toLowerCase())
  if (i < 0) return sentence
  const end = sentence.slice(i).search(/[\s,.;:!?]|$/) + i
  return (
    <>
      {sentence.slice(0, i)}
      <span class="font-semibold text-ink underline decoration-margin decoration-2 underline-offset-4">{sentence.slice(i, end)}</span>
      {sentence.slice(end)}
    </>
  )
}

export function OwnerFilter() {
  const others = owners.value.filter((o) => o !== profile.value)
  return (
    <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Whose words">
      <Chip active={ownerFilter.value === 'mine'} onClick={() => (ownerFilter.value = 'mine')}>My words</Chip>
      {others.map((o) => (
        <Chip active={ownerFilter.value === o} onClick={() => (ownerFilter.value = o)}>{o}'s words</Chip>
      ))}
      <Chip active={ownerFilter.value === 'all'} onClick={() => (ownerFilter.value = 'all')}>Everyone's</Chip>
    </div>
  )
}
