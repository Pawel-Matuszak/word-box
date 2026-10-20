import { signal } from '@preact/signals'

export type Route = 'home' | 'study' | 'quiz' | 'words' | 'settings'
const ROUTES: Route[] = ['home', 'study', 'quiz', 'words', 'settings']

function parse(): Route {
  const r = location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(r) ? r : 'home'
}

export const route = signal<Route>(parse())

window.addEventListener('hashchange', () => {
  route.value = parse()
  window.scrollTo(0, 0)
})

export function go(r: Route) {
  location.hash = r === 'home' ? '/' : `/${r}`
}
