import { useMemo, useState } from 'preact/hooks'
import { CategoryPill, FilterNote } from '../components/cards'
import { Button, Chip, Field, Header, Icon, inputClass, levelTone, Sheet, toast } from '../components/ui'
import { BOXES } from '../srs'
import { activeCategory, addWord, ALL_WORDS, categories, deleteWord, errorText, isGuest, levels, myProgress, online, owners, pool, profile, updateWord, writeKey } from '../store'
import type { Word, WordInput } from '../types'

export function Words() {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('')
  const [editing, setEditing] = useState<Word | 'new' | null>(null)
  const canWrite = !!writeKey.value && !isGuest.value

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pool.value
      .filter((w) => !level || w.level === level)
      .filter((w) => !q || w.word.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q))
      .sort((a, b) => b.id - a.id)
  }, [pool.value, query, level])

  return (
    <>
      <Header
        title="Words"
        action={
          canWrite && (
            <Button class="!min-h-10 !px-4 text-sm" onClick={() => setEditing('new')}>
              <Icon.plus class="size-4" /> Add word
            </Button>
          )
        }
      />

      {!canWrite && (
        <p class="mb-4 rounded-xl bg-pen-soft px-4 py-3 text-sm text-ink">
          You can browse words. To add or edit them,{' '}
          <a href="#/settings" class="font-semibold text-pen underline underline-offset-2">
            {isGuest.value ? 'pick your name in Settings' : 'add your write key in Settings'}
          </a>
          .
        </p>
      )}

      <div class="relative">
        <Icon.search class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-soft" />
        <input type="search" value={query} onInput={(e) => setQuery(e.currentTarget.value)} placeholder="Search in English or Polish" aria-label="Search words" class={`${inputClass} bg-card pl-11`} />
      </div>

      <div class="mt-3 grid gap-2">
        <FilterNote />
        <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Filters">
          <CategoryPill />
          <Chip active={!level} onClick={() => setLevel('')}>All levels</Chip>
          {levels.value.map((l) => (
            <Chip active={level === l} onClick={() => setLevel(level === l ? '' : l)}>{l}</Chip>
          ))}
        </div>
      </div>

      <p class="mt-4 mb-2 text-sm text-ink-soft">{list.length === 1 ? '1 word' : `${list.length} words`}</p>

      {list.length === 0 ? (
        <p class="mt-8 text-center text-ink-soft">{query ? `Nothing matches “${query}”.` : 'No words here yet.'}</p>
      ) : (
        <ul class="overflow-hidden rounded-2xl bg-card shadow-card">
          {list.map((w) => {
            const box = myProgress.value.get(w.id)?.box ?? 0
            return (
              <li class="border-b border-hairline last:border-0">
                <button type="button" onClick={() => setEditing(w)} class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-desk/60">
                  <span class={`size-2.5 shrink-0 rounded-full ${levelTone(w.level).split(' ')[0]} ring-2 ring-current ${levelTone(w.level).split(' ')[1]}`} title={w.level} />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-bold">{w.word}</span>
                    <span class="hand block truncate text-[1.3rem] leading-7 text-pen">{w.translation}</span>
                  </span>
                  <span class="shrink-0 text-right text-xs text-ink-soft">
                    {BOXES[box].label}
                    {w.category && activeCategory.value === ALL_WORDS && <span class="block">{w.category}</span>}
                    {w.owner !== profile.value && <span class="block">{w.owner}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a word' : canWrite ? 'Edit word' : 'Word'}>
        {editing !== null && <WordForm key={editing === 'new' ? 'new' : editing.id} word={editing === 'new' ? null : editing} readOnly={!canWrite} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  )
}

function WordForm({ word, readOnly, onDone }: { word: Word | null; readOnly: boolean; onDone: () => void }) {
  const [form, setForm] = useState<WordInput>(
    word ?? { word: '', translation: '', level: levels.value[0] ?? '', owner: owners.value.includes(profile.value) ? profile.value : (owners.value[0] ?? ''), category: activeCategory.value === ALL_WORDS ? '' : activeCategory.value, notes: '', example_en: '', example_pl: '' },
  )
  const [busy, setBusy] = useState<'' | 'save' | 'delete'>('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (k: keyof WordInput) => (e: Event) => setForm({ ...form, [k]: (e.currentTarget as HTMLInputElement).value })

  async function save(e: Event) {
    e.preventDefault()
    setBusy('save')
    try {
      if (word) await updateWord({ ...form, id: word.id })
      else await addWord(form)
      toast(word ? 'Changes saved' : `Added “${form.word}”`)
      onDone()
    } catch (err) {
      toast(errorText(err), 'error')
      setBusy('')
    }
  }

  async function remove() {
    if (!word) return
    setBusy('delete')
    try {
      await deleteWord(word.id)
      toast(`Deleted “${word.word}”`)
      onDone()
    } catch (err) {
      toast(errorText(err), 'error')
      setBusy('')
    }
  }

  return (
    <form onSubmit={save} class="grid gap-4">
      <fieldset disabled={readOnly || !!busy} class="grid gap-4">
        <div class="grid grid-cols-2 gap-3">
          <Field label="English">
            <input required class={inputClass} value={form.word} onInput={set('word')} lang="en" autocapitalize="off" />
          </Field>
          <Field label="Polish">
            <input required class={inputClass} value={form.translation} onInput={set('translation')} lang="pl" autocapitalize="off" />
          </Field>
        </div>
        <Pick label="Level" value={form.level} options={levels.value} onChange={(level) => setForm({ ...form, level })} />
        <Pick label="Whose word" value={form.owner} options={owners.value} onChange={(owner) => setForm({ ...form, owner })} />
        <CategoryPick value={form.category} onChange={(category) => setForm({ ...form, category })} />
        <Field label="Example in English">
          <textarea rows={2} class={inputClass} value={form.example_en} onInput={set('example_en')} lang="en" />
        </Field>
        <Field label="Example in Polish">
          <textarea rows={2} class={inputClass} value={form.example_pl} onInput={set('example_pl')} lang="pl" />
        </Field>
        <Field label="Notes">
          <textarea rows={2} class={inputClass} value={form.notes} onInput={set('notes')} placeholder="Anything that helps you remember it" />
        </Field>
      </fieldset>

      {!readOnly && (
        <>
          {!online.value && <p class="text-sm font-medium text-berry">You are offline. Connect to save changes.</p>}
          <Button type="submit" disabled={!!busy || !online.value}>
            {busy === 'save' ? 'Saving…' : word ? 'Save changes' : 'Add word'}
          </Button>
          {word &&
            (confirmDelete ? (
              <div class="grid grid-cols-2 gap-3 rounded-2xl bg-berry-soft p-3">
                <p class="col-span-2 text-sm font-medium text-berry">Delete “{word.word}” from the sheet for everyone?</p>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep it</Button>
                <Button class="!bg-berry !text-card" onClick={remove} disabled={!!busy || !online.value}>
                  {busy === 'delete' ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete word</Button>
            ))}
        </>
      )}
    </form>
  )
}

function Pick({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <p class="mb-1.5 text-sm font-semibold">{label}</p>
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            class={`rounded-full px-4 py-2 text-sm font-semibold transition ${value === o ? 'bg-ink text-desk' : 'bg-desk text-ink-soft ring-1 ring-hairline hover:text-ink'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Existing categories as pills, plus "New…" for typing one. Tapping the selected pill clears it. */
function CategoryPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const known = categories.value
  const [typing, setTyping] = useState(!!value && !known.includes(value))
  const pill = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-ink text-desk' : 'bg-desk text-ink-soft ring-1 ring-hairline hover:text-ink'}`
  return (
    <div>
      <p class="mb-1.5 text-sm font-semibold">
        Category <span class="font-normal text-ink-soft">(optional)</span>
      </p>
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
        {known.map((c) => (
          <button
            type="button"
            role="radio"
            aria-checked={!typing && value === c}
            onClick={() => {
              setTyping(false)
              onChange(value === c && !typing ? '' : c)
            }}
            class={pill(!typing && value === c)}
          >
            {c}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={typing}
          onClick={() => {
            setTyping(true)
            onChange('')
          }}
          class={pill(typing)}
        >
          New…
        </button>
      </div>
      {typing && (
        <input
          class={`${inputClass} mt-2`}
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          placeholder="e.g. Food, Travel, Phrasal verbs"
          aria-label="New category"
          autoFocus
        />
      )}
    </div>
  )
}
