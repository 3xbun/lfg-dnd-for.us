<template>
  <div class="flex flex-col h-screen">
    <!-- Header is handled by App.vue, but we need a local title/controls -->
    <div class="p-4 border-b bg-background">
      <h1 class="text-2xl font-bold">{{ t('lfg.mapTitle') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('lfg.mapSubtitle') }}</p>
    </div>

    <div id="map" class="flex-1 w-full h-full z-0"></div>

    <!-- Loading Overlay -->
    <div v-if="loading"
      class="absolute inset-0 bg-background/80 backdrop-blur-sm z-[1000] flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm font-medium">{{ t('lfg.loadingStores') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../stores/theme.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const { t } = useI18n()
const { state: theme } = useTheme()
const loading = ref(true)
let map = null
let markers = []

const MAPTILER_KEY = 'tW6zuPAZUkbXppVCFbvq'

// Fix for Leaflet default icon images not loading in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/retina-marker-icon.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom Gold Icon for Verified Stores (FontAwesome)
const goldIcon = L.divIcon({
  html: '<span class="store-pin store-pin--verified"></span>',
  className: 'custom-div-icon',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36],
})

// Custom Blue Icon for Unverified Stores
const blueIcon = L.divIcon({
  html: '<span class="store-pin store-pin--unverified"></span>',
  className: 'custom-div-icon',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36],
})

async function fetchVerifiedStores() {
  try {
    const response = await fetch('/api/stores')
    if (!response.ok) return []
    const data = await response.json()
    return data.records || []
  } catch (e) {
    console.error('Error fetching verified stores:', e)
    return []
  }
}

async function fetchOSMStores(lat, lon) {
  try {
    const query = `
      [out:json][timeout:25];
      (
        node["shop"="hobby"](around:10000, ${lat}, ${lon});
        node["shop"="games"](around:10000, ${lat}, ${lon});
        node["shop"](around:10000, ${lat}, ${lon})[name~"game|hobby|ttrpg",i];
      );
      out body;
    `
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    const response = await fetch(url)
    const data = await response.json()
    return data.elements
  } catch (e) {
    console.error('Error fetching OSM stores:', e)
    return []
  }
}

function getTileUrl() {
  const style = theme.isDark ? 'basic-dark' : 'streets'
  return `https://api.maptiler.com/maps/${style}/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
}

function escapePopupText(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character])
}

function storePopup(store) {
  const name = escapePopupText(store.name || 'TTRPG Store')
  const region = escapePopupText(store.region || '')
  const mapUrl = escapePopupText(store.googleMap || `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lon}`)

  return `
    <article class="store-popup-card">
      <h3 class="store-popup-title">${name}</h3>
      ${region ? `<p class="store-popup-region">${region}</p>` : ''}
      <a class="store-popup-link" href="${mapUrl}" target="_blank" rel="noopener noreferrer">
        Open in Google Maps
      </a>
    </article>
  `
}

function initMap(lat, lon) {
  map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([lat, lon], 13)

  // Using a reactive tile layer
  L.tileLayer(getTileUrl(), {
    maxZoom: 20
  }).addTo(map)

  L.marker([lat, lon], {
    icon: L.divIcon({
      className: 'custom-div-icon',
      html: '<span class="store-pin current-location-pin"></span>',
      iconSize: [34, 44],
      iconAnchor: [17, 44],
      popupAnchor: [0, -44],
    })
  }).addTo(map).bindPopup('You are here').openPopup()
}

// Watch theme changes to update map tiles in real-time
watch(() => theme.isDark, () => {
  if (map) {
    // To update tiles, we remove old layers and add new ones or use a variable
    // Simpler: refresh page or use a layer group. 
    // Let's just reload the map for now to ensure the style changes.
    location.reload()
  }
})

onMounted(async () => {
  const FALLBACK_LOC = { lat: 13.7563, lon: 100.5018 }

  if (!navigator.geolocation) {
    initMap(FALLBACK_LOC.lat, FALLBACK_LOC.lon)
    await loadAllStores(FALLBACK_LOC.lat, FALLBACK_LOC.lon)
    return
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      initMap(latitude, longitude)
      await loadAllStores(latitude, longitude)
    },
    (error) => {
      initMap(FALLBACK_LOC.lat, FALLBACK_LOC.lon)
      loadAllStores(FALLBACK_LOC.lat, FALLBACK_LOC.lon)
    },
    { enableHighAccuracy: true }
  )
})

async function loadAllStores(lat, lon) {
  loading.value = true
  try {
    // Only load Verified Stores from NocoDB
    const verified = await fetchVerifiedStores()
    verified.forEach(store => {
      if (Number.isFinite(store.lat) && Number.isFinite(store.lon)) {
        L.marker([store.lat, store.lon], { icon: goldIcon })
          .bindPopup(storePopup(store), { className: 'store-popup' })
          .addTo(map)
      }
    })
  } finally {
    loading.value = false
  }
}


onUnmounted(() => {
  if (map) map.remove()
})
</script>



<style scoped>
/* Ensure the map container takes full height of the viewport */
#map {
  height: 100%;
  width: 100%;
  min-height: 400px;
  z-index: 1;
}

:global(.custom-div-icon) {
  background: transparent;
  border: 0;
}

:global(.store-pin),
:global(.current-location-pin) {
  display: block;
  box-sizing: border-box;
}

:global(.store-pin) {
  width: 28px;
  height: 28px;
  border: 3px solid #ffffff;
  border-radius: 50% 50% 50% 0;
  box-shadow: 0 2px 5px rgb(0 0 0 / 35%);
  transform: rotate(-45deg);
}

:global(.store-pin::after) {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  margin: 7px auto;
  border-radius: 50%;
  background: #ffffff;
}

:global(.store-pin--verified) {
  background: #d97706;
}

:global(.store-pin--unverified) {
  background: #2563eb;
}

:global(.current-location-pin) {
  width: 34px;
  height: 34px;
  border: 4px solid #ffffff;
  border-radius: 50% 50% 50% 0;
  background: var(--primary);
  box-shadow: 0 2px 6px rgb(0 0 0 / 55%);
  transform: rotate(-45deg);
}

:global(.current-location-pin::after) {
  content: '';
  display: block;
  width: 10px;
  height: 10px;
  margin: 8px auto;
  border-radius: 50%;
  background: #ffffff;
}

:global(.store-popup .leaflet-popup-content-wrapper) {
  border-radius: 10px;
}

:global(.store-popup .leaflet-popup-content) {
  margin: 14px;
  min-width: 190px;
}

:global(.store-popup-card) {
  display: grid;
  gap: 6px;
}

:global(.store-popup-title) {
  margin: 0;
  color: #1a1a1a;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
}

:global(.store-popup-region) {
  margin: 0 0 4px;
  color: #666666;
  font-size: 13px;
}

:global(.store-popup .leaflet-popup-content .store-popup-link) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 6px;
  background: #9f1404;
  color: #ffffff !important;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

:global(.store-popup .leaflet-popup-content .store-popup-link:hover) {
  background: #7a1003;
  color: #ffffff !important;
  text-decoration: none;
}

/* Force the container to be a flex item that grows */
.flex-1 {
  flex: 1 1 0%;
}
</style>
