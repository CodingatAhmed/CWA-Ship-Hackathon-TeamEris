const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const API_BASE_URL = configuredBaseUrl?.replace(/\/$/, '') ?? ''

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const payload = await response.json()

  if (!response.ok) {
    const error = new Error(payload.detail ?? 'The API request failed.')
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export const apiClient = Object.freeze({
  getHealth: () => request('/health'),
  compareQuotes: (comparison) =>
    request('/api/compare', {
      method: 'POST',
      body: JSON.stringify(comparison),
    }),
})

