import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import i18n from './i18n/index.js'
import { useTheme } from './stores/theme.js'
import './style.css'

const { init: initTheme } = useTheme()
initTheme()

const app = createApp(App)
app.use(router)
app.use(i18n)
app.mount('#app')
