import { signal } from '@preact/signals'
import type { ButtonHTMLAttributes, ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { levels } from '../store'

// ---------- icons ----------

type IconProps = { class?: string }
const svg = (d: ComponentChildren) => ({ class: cls }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class={cls ?? 'size-6'} aria-hidden="true">
    {d}
  </svg>
)

export const Icon = {
  box: svg(<><path d="M3.5 10h17l-1.4 9.1a1.5 1.5 0 0 1-1.5 1.3H6.4a1.5 1.5 0 0 1-1.5-1.3z" /><path d="M6 10V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V10" /><path d="M10 14h4" /></>),
  cards: svg(<><rect x="3" y="7" width="14" height="13" rx="2" /><path d="M7 4h12a2 2 0 0 1 2 2v11" /><path d="M6 12h8M6 15.5h5" /></>),
  quiz: svg(<><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.4 2.4 4.8-5" /></>),
  list: svg(<><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r=".6" fill="currentColor" /><circle cx="4" cy="12" r=".6" fill="currentColor" /><circle cx="4" cy="18" r=".6" fill="currentColor" /></>),
  gear: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  back: svg(<path d="M15 5l-7 7 7 7" />),
  plus: svg(<path d="M12 5v14M5 12h14" />),
  search: svg(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>),
  close: svg(<path d="M6 6l12 12M18 6 6 18" />),
  swap: svg(<><path d="M7 7h12l-3-3M17 17H5l3 3" /></>),
  cloud: svg(<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18.5z" />),
}

// ---------- level colours ----------

const LEVEL_TONES = [
  'bg-leaf-soft text-leaf',
  'bg-amber-soft text-amber',
  'bg-berry-soft text-berry',
]

export function levelTone(level: string) {
  const i = levels.value.indexOf(level)
  return LEVEL_TONES[Math.max(0, Math.min(LEVEL_TONES.length - 1, i))]
}

export function LevelChip({ level }: { level: string }) {
  if (!level) return null
  return <span class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelTone(level)}`}>{level}</span>
}

// ---------- controls ----------

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
}

export function buttonClass(variant: ButtonProps['variant'] = 'primary') {
  const tone = {
    primary: 'bg-pen text-card shadow-card hover:brightness-110 active:brightness-95',
    ghost: 'bg-card text-ink shadow-card hover:bg-pen-soft',
    quiet: 'text-pen hover:bg-pen-soft',
    danger: 'text-berry hover:bg-berry-soft',
  }[variant]
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold transition disabled:pointer-events-none disabled:opacity-45 ${tone}`
}

export function Button({ variant, class: cls = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} class={`${buttonClass(variant)} ${cls}`} {...rest} />
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ComponentChildren }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      class={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active ? 'bg-ink text-desk' : 'bg-card text-ink-soft ring-1 ring-hairline hover:text-ink'}`}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} class="grid auto-cols-fr grid-flow-col rounded-full bg-card p-1 ring-1 ring-hairline">
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          class={`rounded-full px-3 py-2 text-sm font-semibold transition ${value === o.value ? 'bg-pen text-card' : 'text-ink-soft hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ComponentChildren }) {
  return (
    <label class="block">
      <span class="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span class="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl bg-desk px-3.5 py-3 text-base text-ink ring-1 ring-hairline placeholder:text-ink-soft/70 focus:ring-2 focus:ring-pen focus:outline-none'

// ---------- layout ----------

export function Header({ title, back, action }: { title?: string; back?: boolean; action?: ComponentChildren }) {
  return (
    <header class="pt-safe mb-5 flex items-center gap-2">
      {back && (
        <a href="#/" class="-ml-2 grid size-11 place-items-center rounded-full text-ink-soft hover:bg-card hover:text-ink" aria-label="Back to home">
          <Icon.back />
        </a>
      )}
      {title ? <h1 class="text-2xl font-bold tracking-tight">{title}</h1> : <Wordmark />}
      <div class="ml-auto">{action}</div>
    </header>
  )
}

export function Wordmark() {
  return (
    <span class="flex items-center gap-2 text-xl font-extrabold tracking-tight">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" class="size-8" />
      Word Box
    </span>
  )
}

// ---------- bottom sheet ----------

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input, textarea, button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [open])
  if (!open) return null
  return (
    <div class="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div class="fade-in absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} class="sheet-up relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 pb-safe shadow-card sm:rounded-3xl">
        <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-hairline sm:hidden" />
        <div class="mb-4 flex items-center">
          <h2 class="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} class="ml-auto -mr-2 grid size-10 place-items-center rounded-full text-ink-soft hover:bg-desk" aria-label="Close">
            <Icon.close class="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------- toast ----------

const toastMsg = signal<{ text: string; tone: 'ok' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

export function toast(text: string, tone: 'ok' | 'error' = 'ok') {
  toastMsg.value = { text, tone }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = null), 3200)
}

export function Toaster() {
  const t = toastMsg.value
  return (
    <div aria-live="polite" class="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      {t && (
        <div class={`deal-in rounded-2xl px-4 py-3 text-sm font-semibold shadow-card ${t.tone === 'error' ? 'bg-berry text-card' : 'bg-ink text-desk'}`}>{t.text}</div>
      )}
    </div>
  )
}

// ---------- bottom nav ----------

export function NavBar({ current }: { current: string }) {
  const items = [
    { to: 'home', href: '#/', label: 'Home', icon: Icon.box },
    { to: 'study', href: '#/study', label: 'Study', icon: Icon.cards },
    { to: 'quiz', href: '#/quiz', label: 'Quiz', icon: Icon.quiz },
    { to: 'words', href: '#/words', label: 'Words', icon: Icon.list },
  ]
  return (
    <nav class="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-desk/90 backdrop-blur-md" aria-label="Main">
      <ul class="mx-auto grid max-w-lg grid-cols-4 px-2 pt-1.5">
        {items.map(({ to, href, label, icon: I }) => {
          const active = current === to
          return (
            <li>
              <a href={href} aria-current={active ? 'page' : undefined} class={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs font-semibold transition ${active ? 'text-pen' : 'text-ink-soft hover:text-ink'}`}>
                <span class={`grid h-8 w-14 place-items-center rounded-full transition ${active ? 'bg-pen-soft' : ''}`}>
                  <I class="size-[22px]" />
                </span>
                {label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
