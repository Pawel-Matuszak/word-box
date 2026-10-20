import { OwnerFilter } from '../components/cards'
import { Header, Icon } from '../components/ui'
import { go } from '../router'
import { BOXES } from '../srs'
import { duePool, myProgress, pool, profile, syncError, todayTally } from '../store'

export function Home() {
  const prog = myProgress.value
  const counts = BOXES.map(() => 0)
  for (const w of pool.value) counts[prog.get(w.id)?.box ?? 0]++
  const max = Math.max(1, ...counts)
  const due = duePool.value.length

  const { reviewed, known } = todayTally.value

  return (
    <>
      <Header
        action={
          <a href="#/settings" class="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-card hover:text-ink" aria-label="Settings">
            <Icon.gear />
          </a>
        }
      />

      <h1 class="text-[2.25rem] leading-tight font-extrabold tracking-tight">Hi, {profile.value}</h1>
      <p class="mt-1 text-lg text-ink-soft">
        {pool.value.length === 0
          ? 'This box is empty. Add a few words to get going.'
          : due === 0
            ? 'All caught up. New cards will be due tomorrow.'
            : due === 1
              ? 'One card is waiting for you.'
              : `${due} cards are waiting for you.`}
      </p>

      <div class="mt-5">
        <OwnerFilter />
      </div>

      {/* The box: one divider per Leitner compartment, taller when it holds more cards. */}
      <section class="mt-7" aria-label="Cards in each box">
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
            <div class="mx-auto mt-3 h-2 w-16 rounded-full bg-black/25" />
          </div>
        </div>
        <p class="mt-3 px-1 text-sm text-ink-soft">
          Cards move one box to the right each time you know them, and go back to Daily when you miss one.
        </p>
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

      {syncError.value && <p class="mt-5 rounded-xl bg-berry-soft px-4 py-3 text-sm font-medium text-berry">{syncError.value}</p>}
    </>
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
