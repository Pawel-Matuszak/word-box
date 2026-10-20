import { useState } from 'preact/hooks'
import { api, isDemo } from '../api'
import { Button, Field, Header, inputClass, toast } from '../components/ui'
import { errorText, flushQueue, lastSynced, online, owners, pendingCount, profile, refresh, syncError, writeKey } from '../store'

export function Settings() {
  const [key, setKey] = useState(writeKey.value)
  const [busy, setBusy] = useState<'' | 'key' | 'sync'>('')

  async function saveKey(e: Event) {
    e.preventDefault()
    const k = key.trim()
    if (!k) {
      writeKey.value = ''
      toast('Write key removed')
      return
    }
    setBusy('key')
    try {
      await api.checkKey(k)
      writeKey.value = k
      toast('Write key saved')
      flushQueue()
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setBusy('')
    }
  }

  async function syncNow() {
    setBusy('sync')
    await flushQueue()
    await refresh()
    setBusy('')
    if (!syncError.value) toast('Up to date')
  }

  return (
    <>
      <Header title="Settings" back />

      <Section title="You are">
        <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Profile">
          {owners.value.map((o) => (
            <button
              type="button"
              role="radio"
              aria-checked={profile.value === o}
              onClick={() => (profile.value = o)}
              class={`hand rounded-xl px-5 py-1 text-[1.6rem] font-bold transition ${profile.value === o ? 'bg-pen text-card' : 'bg-desk text-pen ring-1 ring-hairline'}`}
            >
              {o}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Write key">
        <form onSubmit={saveKey} class="grid gap-3">
          <Field label="Key" hint="Needed to add or edit words and to save progress to the sheet. It is stored only on this device.">
            <input type="password" autocomplete="current-password" class={inputClass} value={key} onInput={(e) => setKey(e.currentTarget.value)} />
          </Field>
          <Button type="submit" disabled={busy === 'key'}>
            {busy === 'key' ? 'Checking…' : key.trim() ? 'Save key' : 'Remove key'}
          </Button>
        </form>
      </Section>

      <Section title="Sync">
        <dl class="grid gap-2 text-sm">
          <Row label="Connection" value={online.value ? 'Online' : 'Offline'} />
          <Row label="Last updated" value={lastSynced.value ? new Date(lastSynced.value).toLocaleString() : 'Never'} />
          <Row label="Answers waiting to upload" value={String(pendingCount.value)} />
          {isDemo && <Row label="Mode" value="Demo data (no sheet connected)" />}
        </dl>
        {pendingCount.value > 0 && !writeKey.value && <p class="mt-3 text-sm text-ink-soft">Your answers are saved on this device. Add a write key to upload them to the sheet.</p>}
        {syncError.value && <p class="mt-3 text-sm font-medium text-berry">{syncError.value}</p>}
        <Button variant="ghost" class="mt-4 w-full" onClick={syncNow} disabled={!!busy || !online.value}>
          {busy === 'sync' ? 'Syncing…' : 'Sync now'}
        </Button>
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <section class="mb-5 rounded-[20px] bg-card p-5 shadow-card">
      <h2 class="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div class="flex justify-between gap-4">
      <dt class="text-ink-soft">{label}</dt>
      <dd class="text-right font-semibold">{value}</dd>
    </div>
  )
}
