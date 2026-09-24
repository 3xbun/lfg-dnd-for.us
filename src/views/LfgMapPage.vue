<template>
  <div class="flex flex-col h-screen">
    <!-- Header is handled by App.vue, but we need a local title/controls -->
    <div class="p-4 border-b bg-background">
      <h1 class="text-2xl font-bold">{{ t('lfg.mapTitle') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('lfg.mapSubtitle') }}</p>
    </div>

    <div id="map" class="flex-1 w-full h-full z-0"></div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="absolute inset-0 bg-background/80 backdrop-blur-sm z-[1000] flex items-center justify-center">
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
  html: '<i class="fa-duotone fa-solid fa-location-check text-amber-500 text-3xl drop-shadow-md"></i>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
})

// Custom Blue Icon for Unverified Stores (FontAwesome)
const blueIcon = L.divIcon({
  html: '<i class="fa-sharp-duotone fa-solid fa-location-pin text-blue-500 text-3xl drop-shadow-md"></i>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
})

async function fetchVerifiedStores() {
  try {
    const response = await fetch('/api/stores')
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
      className: 'bg-primary w-4 h-4 rounded-full border-2 border-white shadow-lg',
      html: ''
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
  
  // Only load Verified Stores from NocoDB
  const verified = await fetchVerifiedStores()
  verified.forEach(store => {
    L.marker([store.lat, store.lon], { icon: goldIcon })
      .bindPopup(`<strong style="color: #d4af37;">⭐ ${store.name}</strong><br>${store.region} (Verified)`)
      .addTo(map)
  })

  loading.value = false
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

/* Force the container to be a flex item that grows */
.flex-1 {
  flex: 1 1 0%;
}
</style>
