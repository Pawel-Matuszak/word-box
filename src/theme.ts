import { effect, signal } from '@preact/signals'

type Theme = 'light' | 'dark'

const KEY = 'wb:theme'
const media = matchMedia('(prefers-color-scheme: dark)')
const system = (): Theme => (media.matches ? 'dark' : 'light')

function chosen(): Theme | null {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}

/** Follows the system until the user picks one with the toggle. */
export const theme = signal<Theme>(chosen() ?? system())

media.addEventListener('change', () => {
  if (!chosen()) theme.value = system()
})

effect(() => {
  document.documentElement.dataset.theme = theme.value
  document.querySelector<HTMLMetaElement>('meta[name=theme-color]')?.setAttribute('content', theme.value === 'dark' ? '#151B2C' : '#EEF1F6')
})

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(KEY, theme.value)
  } catch {
    /* the choice just won't survive a reload */
  }
}
