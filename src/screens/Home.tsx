import { useEffect, useRef, useState } from 'preact/hooks'
import { activeLabel, CategorySheet, FilterNote, hasCategories } from '../components/cards'
import { Header, Icon, ThemeToggle } from '../components/ui'
import { go } from '../router'
import { BOXES } from '../srs'
import { duePool, isGuest, myProgress, pool, profile, syncError, todayTally } from '../store'

export function Home() {
  const prog = myProgress.value
  const counts = BOXES.map(() => 0)
  for (const w of pool.value) counts[prog.get(w.id)?.box ?? 0]++
  const max = Math.max(1, ...counts)
  const due = duePool.value.length

  const { reviewed, known } = todayTally.value
  const [picking, setPicking] = useState(false)
  const fresh = prog.size === 0

  return (
    <>
      <Header
        action={
          <div class="-mr-2 flex items-center">
            <ThemeToggle />
            <a href="#/settings" class="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-card hover:text-ink" aria-label="Settings">
              <Icon.gear />
            </a>
          </div>
        }
      />

      <div class="flex items-end gap-3">
        <div class="min-w-0 flex-1">
          <h1 class="text-[1.85rem] leading-tight font-extrabold tracking-tight">{isGuest.value ? 'Hi there' : `Hi, ${profile.value}`}</h1>
          <p class="text-base text-ink-soft">
        {pool.value.length === 0
          ? 'This box is empty. Add a few words to get going.'
          : due === 0
            ? 'All caught up. New cards will be due tomorrow.'
            : due === 1
              ? 'One card is waiting for you.'
              : `${due} cards are waiting for you.`}
          </p>
        </div>
        <BoxHelp fresh={fresh} />
      </div>

      <div class="mt-2">
        <FilterNote />
      </div>

      {/* The box: one divider per Leitner compartment, taller when it holds more cards. */}
      <section class="mt-5" aria-label="Cards in each box">
        <div class="relative px-3">
          <div class="flex h-36 items-end gap-1.5">
            {BOXES.map((b, i) => (
              <div
                class="index-card plain w-full flex-1 rounded-t-[10px] pt-2 text-center transition-[height] duration-500"
                style={{ height: `${56 + (counts[i] / max) * 88}px`, ['--head' as string]: '2rem' }}
                title={`${b.label}: ${counts[i]} cards`}
              >
                <span class={`block text-lg leading-none font-extrabold tabular-nums ${counts[i] ? 'text-ink' : 'text-ink-soft/45'}`}>{counts[i]}</span>
              </div>
            ))}
          </div>
          <div class="relative -mx-3 -mt-4 rounded-t-md rounded-b-[22px] bg-box px-3 pt-3 pb-3 shadow-card">
            <div class="flex gap-1.5">
              {BOXES.map((b) => (
                <span class="flex-1 text-center text-[11px] leading-tight font-semibold text-white/80">{b.label}</span>
              ))}
            </div>
            {hasCategories() ? (
              // The label slot on the front of the box: says which cards are inside, tap to swap.
              <button
                type="button"
                onClick={() => setPicking(true)}
                aria-haspopup="dialog"
                aria-label={`Category: ${activeLabel()}. Change category`}
                class="mx-auto mt-3 flex max-w-[85%] items-center gap-1.5 rounded-md bg-card px-4 py-0.5 text-pen ring-2 ring-black/25 transition hover:-translate-y-px"
              >
                <span class="hand truncate text-[1.45rem] leading-8 font-bold">{activeLabel()}</span>
                <Icon.back class="size-4 shrink-0 -rotate-90 text-ink-soft" />
              </button>
            ) : (
              <div class="mx-auto mt-3 h-2 w-16 rounded-full bg-black/25" />
            )}
          </div>
        </div>
      </section>

      <div class="mt-7 grid gap-3">
        <button
          type="button"
          onClick={() => go('study')}
          disabled={pool.value.length === 0}
          class="group flex items-center gap-4 rounded-[20px] bg-pen p-5 text-left text-card shadow-card transition hover:brightness-110 disabled:opacity-45"
        >
          <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-card/15">
            <Icon.cards class="size-7" />
          </span>
          <span>
            <span class="block text-xl font-bold">{due ? `Study ${due} card${due === 1 ? '' : 's'}` : 'Practise anyway'}</span>
            <span class="block text-sm text-card/80">Turn cards over and say if you knew them</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => go('quiz')}
          disabled={pool.value.length < 2}
          class="flex items-center gap-4 rounded-[20px] bg-card p-5 text-left shadow-card transition hover:bg-pen-soft disabled:opacity-45"
        >
          <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-pen-soft text-pen">
            <Icon.quiz class="size-7" />
          </span>
          <span>
            <span class="block text-xl font-bold">Quiz yourself</span>
            <span class="block text-sm text-ink-soft">Pick or type the right translation</span>
          </span>
        </button>
      </div>

      <dl class="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Answered today" value={reviewed} />
        <Stat label="Known today" value={known} />
        <Stat label="Words in box" value={pool.value.length} />
      </dl>

      <CategorySheet open={picking} onClose={() => setPicking(false)} />

      {syncError.value && <p class="mt-5 rounded-xl bg-berry-soft px-4 py-3 text-sm font-medium text-berry">{syncError.value}</p>}
    </>
  )
}

const HELP_SEEN = 'wb:boxHelpSeen'

/** "?" above the box. Opens by itself once, before the first answer. */
function BoxHelp({ fresh }: { fresh: boolean }) {
  const [open, setOpen] = useState(() => {
    try {
      return fresh && !localStorage.getItem(HELP_SEEN)
    } catch {
      return false
    }
  })
  const ref = useRef<HTMLDivElement>(null)

  function close() {
    setOpen(false)
    try {
      localStorage.setItem(HELP_SEEN, '1')
    } catch {
      /* fine: it just opens again next time */
    }
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && close()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} class="relative shrink-0">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="box-help"
        aria-label="How the box works"
        class={`grid size-8 place-items-center rounded-full text-sm font-extrabold transition ${open ? 'bg-ink text-desk' : 'bg-card text-ink-soft shadow-card hover:text-ink'}`}
      >
        ?
      </button>
      {open && (
        <div id="box-help" role="dialog" aria-label="How the box works" class="fade-in absolute top-full right-0 z-20 mt-2.5 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-card p-4 shadow-card ring-1 ring-hairline">
          <span class="absolute -top-[7px] right-[11px] size-3.5 rotate-45 rounded-tl-[3px] border-t border-l border-hairline bg-card" aria-hidden="true" />
          <p class="font-bold">How the box works</p>
          <ul class="mt-3 grid gap-3 text-sm leading-snug">
            <li class="flex gap-3">
              <span class="grid size-8 shrink-0 place-items-center rounded-full bg-leaf-soft text-leaf" aria-hidden="true">
                <Icon.back class="size-4 rotate-180" />
              </span>
              <span>
                <b>Knew it?</b> The card moves one box to the right and waits longer before it comes back.
              </span>
            </li>
            <li class="flex gap-3">
              <span class="grid size-8 shrink-0 place-items-center rounded-full bg-berry-soft text-berry" aria-hidden="true">
                <Icon.back class="size-4" />
              </span>
              <span>
                <b>Missed it?</b> It goes back to Daily, so you see it again soon.
              </span>
            </li>
          </ul>
          <p class="mt-3 border-t border-hairline pt-3 text-sm text-ink-soft">Daily cards return tomorrow. Monthly ones in 30 days.</p>
          {fresh && (
            <button type="button" onClick={close} class="mt-3 w-full rounded-xl bg-pen-soft py-2 text-sm font-bold text-pen hover:brightness-95">
              Got it
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div class="rounded-2xl bg-card px-3 py-3 ring-1 ring-hairline">
      <dd class="text-2xl font-extrabold">{value}</dd>
      <dt class="text-xs leading-tight text-ink-soft">{label}</dt>
    </div>
  )
}
