import { NavBar, Toaster } from './components/ui'
import { route } from './router'
import { Home } from './screens/Home'
import { Quiz } from './screens/Quiz'
import { Settings } from './screens/Settings'
import { Study } from './screens/Study'
import { Welcome } from './screens/Welcome'
import { Words } from './screens/Words'
import { owners, profile } from './store'

const screens = { home: Home, study: Study, quiz: Quiz, words: Words, settings: Settings }

export function App() {
  // Ask for a name until one that still exists in the sheet is chosen.
  if (!profile.value || (owners.value.length && !owners.value.includes(profile.value))) {
    return <Welcome />
  }
  const Screen = screens[route.value]
  return (
    <>
      <main class="mx-auto max-w-lg px-4 pb-32">
        <Screen />
      </main>
      <NavBar current={route.value} />
      <Toaster />
    </>
  )
}
