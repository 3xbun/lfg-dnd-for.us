import { listRecords } from '../_lib/noco.js'

export async function onRequestGet({ env }) {
  try {
    // Fetch all stores from the LFG_Stores table
    // Table ID: m6nzwxyk7i4923x
    const { records } = await listRecords(env, 'm6nzwxyk7i4923x', { pageSize: 100 })

    return new Response(JSON.stringify({
      records: records.map(r => {
        const geo = r.Geolocation || ''
        const [lat, lon] = geo.split(';')
        return {
          id: r.Id,
          name: r.Title,
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          region: r.Region,
          googleMap: r.GoogleMap
        }
      })
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Error fetching stores:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
