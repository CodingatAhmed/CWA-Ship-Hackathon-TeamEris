const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const API_BASE_URL = configuredBaseUrl?.replace(/\/$/, '') ?? ''

const REQUEST_TIMEOUT_MS = 60_000

export const ERROR_KIND = Object.freeze({
  VALIDATION: 'validation',
  RETRYABLE: 'retryable',
  NETWORK: 'network',
  UNEXPECTED: 'unexpected',
})

export class ApiError extends Error {
  constructor(message, { kind, status = null, fieldMessages = [] } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind ?? ERROR_KIND.UNEXPECTED
    this.status = status
    this.fieldMessages = fieldMessages
    this.retryable = this.kind === ERROR_KIND.RETRYABLE || this.kind === ERROR_KIND.NETWORK
  }
}

/**
 * FastAPI returns 422 bodies as `{ detail: [{ loc, msg, type }, ...] }`.
 * Turn that into short human sentences without leaking internals.
 */
function readValidationDetail(detail) {
  if (!Array.isArray(detail)) return []

  return detail
    .map((item) => {
      if (typeof item === 'string') return item
      if (!item || typeof item !== 'object') return null

      const location = Array.isArray(item.loc)
        ? item.loc.filter((part) => part !== 'body' && typeof part !== 'number').join(' → ')
        : ''
      const message = typeof item.msg === 'string' ? item.msg : 'is not valid'
      return location ? `${location}: ${message}` : message
    })
    .filter(Boolean)
}

function readDetailMessage(payload) {
  if (!payload || typeof payload !== 'object') return null
  const { detail } = payload
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
    return detail.message
  }
  return null
}

async function readBody(response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

function toApiError(response, payload) {
  const status = response.status

  if (status === 422 || status === 400) {
    const fieldMessages = readValidationDetail(payload?.detail)
    return new ApiError(
      fieldMessages.length
        ? 'Some inputs were rejected by the comparison service.'
        : readDetailMessage(payload) ?? 'Some inputs were rejected by the comparison service.',
      { kind: ERROR_KIND.VALIDATION, status, fieldMessages },
    )
  }

  if (status === 503 || status === 504) {
    return new ApiError('AI extraction is temporarily unavailable. Retry in a moment.', {
      kind: ERROR_KIND.RETRYABLE,
      status,
    })
  }

  if (status === 429) {
    return new ApiError('The comparison service is busy. Retry in a moment.', {
      kind: ERROR_KIND.RETRYABLE,
      status,
    })
  }

  if (status === 501) {
    return new ApiError(
      'The comparison endpoint is not available on this server yet.',
      { kind: ERROR_KIND.UNEXPECTED, status },
    )
  }

  return new ApiError('The comparison could not be completed. Please try again.', {
    kind: ERROR_KIND.UNEXPECTED,
    status,
  })
}

async function request(path, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
      ...options,
    })
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    throw new ApiError(
      aborted
        ? 'The comparison took too long to respond. Check your connection and retry.'
        : 'The comparison service could not be reached. Check your connection and retry.',
      { kind: ERROR_KIND.NETWORK },
    )
  } finally {
    clearTimeout(timeoutId)
  }

  const payload = await readBody(response)

  if (!response.ok) {
    throw toApiError(response, payload)
  }

  if (payload === null) {
    throw new ApiError('The comparison service returned an unreadable response.', {
      kind: ERROR_KIND.UNEXPECTED,
      status: response.status,
    })
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
