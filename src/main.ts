import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import './styles/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { readSessionOptions } from './session'
import { useRaceStore } from './stores/race'
import { SESSION_OPTIONS } from './injection'

const options = readSessionOptions()
const pinia = createPinia()
const app = createApp(App).use(pinia).use(router)
app.provide(SESSION_OPTIONS, options)
useRaceStore(pinia).startSession(options.seed)
app.mount('#app')
