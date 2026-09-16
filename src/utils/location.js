/** Strip the On-/Off- play-style prefix from a stored location for display. */
export function displayLocation(value) {
  if (!value) return ''
  return value.replace(/^(On|Off)-/, '')
}

/** Filter location options by the selected play style; Hybrid shows all. */
export function locationsForStyle(locations, playStyle) {
  if (!playStyle || playStyle === 'Hybrid') return locations
  const prefix = playStyle === 'Online' ? 'On' : 'Off'
  return locations.filter((v) => v.startsWith(prefix + '-'))
}

/** True when a stored location is compatible with the selected play style. */
export function locationMatches(style, locationValue) {
  return locationsForStyle([locationValue], style).length > 0
}

/**
 * Prefix a custom (free-text) location to match the chosen play style, so the
 * stored value fits the On-/Off- scheme. Already-prefixed and Hybrid values
 * pass through unchanged.
 */
export function prefixLocation(playStyle, value) {
  if (!value || !playStyle) return value
  if (playStyle === 'Hybrid' || locationMatches(playStyle, value)) return value
  const prefix = playStyle === 'Offline' ? 'Off' : 'On'
  return prefix + '-' + value
}