import { demoRequest, isDemoEnabled, signInToDemo } from './demo'

export { isDemoEnabled }

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '')

export async function apiRequest(path, token, options = {}) {
  if (token?.startsWith('demo:')) return demoRequest(path, { ...options, token })

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })
  if (response.status === 204) return null
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.message || 'The request could not be completed.')
  }
  return payload
}

export async function loginRequest(credentials) {
  if (isDemoEnabled()) return signInToDemo(credentials)
  return apiRequest('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify(credentials)
  })
}

export function indianRupees(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(amount) || 0)
}

export function shortDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(new Date(value))
}
