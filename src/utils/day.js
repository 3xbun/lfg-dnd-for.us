/**
 * Day-of-week label helper.
 *
 * The API stores days as short forms (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
 * plus "Flexible", but the i18n keys are full names (monday, tuesday, …).
 * A naive t('lfg.' + v.toLowerCase()) misses and vue-i18n falls back to the
 * raw key (e.g. "lfg.mon"). This maps short → full so labels always resolve.
 *
 * @param {Function} t - the vue-i18n translate function (from useI18n())
 * @param {string} v - a day value from /api/options (e.g. "Mon", "Flexible")
 * @returns {string} the localized day name, or '' for empty input
 */
const DAY_KEY = {
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
}

export function dayLabel(t, v) {
  if (!v) return ''
  const key = DAY_KEY[v.toLowerCase()] || v.toLowerCase()
  return t(`lfg.${key}`)
}
