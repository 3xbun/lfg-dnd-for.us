import { createI18n } from 'vue-i18n'
import en from './en.json'
import th from './th.json'

const savedLocale = localStorage.getItem('locale') || 'th'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, th },
})

export default i18n
