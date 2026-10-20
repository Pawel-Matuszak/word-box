import { useState } from 'preact/hooks'
import { api, isDemo } from '../api'
import { IndexCard } from '../components/cards'
import { Button, Field, inputClass, Wordmark } from '../components/ui'
import { errorText, flushQueue, GUEST, loading, owners, profile, syncError, writeKey } from '../store'

export function Welcome() {
  const [who, setWho] = useState(profile.value)
  const [key, setKey] = useState(writeKey.value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function start(e: Event) {
    e.preventDefault()
    if (!who) return
    setError('')
    if (who === GUEST) {
      profile.value = GUEST
      return
    }
    if (key.trim()) {
      setBusy(true)
      try {
        await api.checkKey(key.trim())
      } catch (err) {
        setBusy(false)
        setError(errorText(err))
        return
      }
      setBusy(false)
    }
    writeKey.value = key.trim()
    profile.value = who
    flushQueue()
  }

  return (
    <main class="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10">
      <div class="mt-4">
        <Wordmark />
      </div>

      <h1 class="mt-12 text-[2.6rem] leading-[1.05] font-extrabold tracking-tight text-balance">Who's studying today?</h1>
      <p class="mt-3 text-ink-soft">Your words come straight from the shared sheet. Pick your name and open your box.</p>

      {loading.value && !owners.value.length ? (
        <p class="mt-10 text-ink-soft">Fetching the word list…</p>
      ) : !owners.value.length ? (
        <p class="mt-10 font-medium text-berry">{syncError.value || 'No names found in the Lists tab of the sheet.'}</p>
      ) : (
        <form onSubmit={start} class="mt-8 flex flex-1 flex-col">
          <div class="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Your name">
            {owners.value.map((o, i) => (
              <button
                type="button"
                role="radio"
                aria-checked={who === o}
                onClick={() => setWho(o)}
                class={`text-left transition ${i % 2 ? 'rotate-[1.2deg]' : '-rotate-[1.2deg]'} ${who === o ? 'scale-[1.03]' : 'opacity-80 hover:opacity-100'}`}
              >
                <IndexCard class={who === o ? 'ring-[2.5px] ring-pen' : ''} head={<span class="text-xs font-semibold text-ink-soft">Name</span>}>
                  <p class="hand pb-3 text-[2.2rem] leading-[4rem] font-bold text-pen">{o}</p>
                </IndexCard>
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={who === GUEST}
              onClick={() => setWho(GUEST)}
              class={`col-span-2 mt-1 rounded-[14px] border-2 border-dashed px-5 py-3 text-left transition ${who === GUEST ? 'border-pen bg-pen-soft' : 'border-hairline hover:border-pen/40'}`}
            >
              <span class="block font-bold">Just looking</span>
              <span class="block text-sm text-ink-soft">Continue as a guest. Progress stays on this device.</span>
            </button>
          </div>

          <div class={`mt-8 ${who === GUEST ? 'hidden' : ''}`}>
            <Field label="Write key (optional)" hint="Lets you add and edit words and save your progress to the sheet. Without it, progress stays on this device.">
              <input
                type="password"
                autocomplete="current-password"
                class={inputClass}
                value={key}
                onInput={(e) => setKey(e.currentTarget.value)}
                placeholder={isDemo ? 'Demo mode: any key works' : 'Ask whoever set up the sheet'}
              />
            </Field>
            {error && <p class="mt-2 text-sm font-semibold text-berry">{error}</p>}
          </div>

          <Button type="submit" class="mt-auto w-full sm:mt-10" disabled={!who || busy}>
            {busy ? 'Checking key…' : who === GUEST ? 'Continue as guest' : who ? `Open ${who}'s box` : 'Pick your name'}
          </Button>
        </form>
      )}
    </main>
  )
}
