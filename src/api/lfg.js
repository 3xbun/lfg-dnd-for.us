/**
 * Client for the /api/* Pages Functions proxy.
 * There is NO database credential here — the NocoDB token lives only in the
 * functions layer (context.env). Never reintroduce a VITE_* token.
 */
import axios from 'axios'

const api = axios.create({
  withCredentials: true, // sends the HttpOnly session cookie
  headers: { 'Content-Type': 'application/json' },
})

export async function listListings(params = {}) {
  const { data } = await api.get('/api/listings', { params })
  return data
}

export async function getListing(id) {
  const { data } = await api.get('/api/listing', { params: { id } })
  return data.record
}

export async function createListing(record) {
  const { data } = await api.post('/api/listings', record)
  return data.record
}

export async function updateListing(id, record) {
  const { data } = await api.patch('/api/listing', record, { params: { id } })
  return data.record
}

export async function deleteListing(id) {
  const { data } = await api.delete('/api/listing', { params: { id } })
  return data
}

export async function joinListing(listingId) {
  const { data } = await api.post('/api/join', { listingId })
  return data
}

export async function linkListing(payload) {
  const { data } = await api.post('/api/link', payload)
  return data.record
}

export async function me() {
  try {
    const { data } = await api.get('/api/auth/me')
    return data.authenticated ? data.user : null
  } catch {
    return null
  }
}

export async function logout() {
  await api.post('/api/auth/logout')
}

export default api
