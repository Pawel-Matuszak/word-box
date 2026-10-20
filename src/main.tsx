import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app'
import { flushQueue, refresh } from './store'
import './index.css'

registerSW({ immediate: true })

render(<App />, document.getElementById('app')!)

refresh().then(flushQueue)
