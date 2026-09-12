import { ContractValidationError, parseCompareResponse } from './contract.js'

const configuredBaseUrl = import.meta.env?.VITE_API_BASE_URL?.trim()
const API_BASE_URL = configuredBaseUrl?.replace(/\/$/, '') ?? ''

// The backend performs two bounded 30-second extractions sequentially for the MVP.
// Leave enough time for response validation and network overhead as well.
const REQUEST_TIMEOUT_MS = 270_000

export const ERROR_KIND = Object.freeze({
  VALIDATION: 'validation',
  CONFIGURATION: 'configuration',
  RETRYABLE: 'retryable',
  TIMEOUT: 'timeout',
  NETWORK: 'network',
  UNEXPECTED: 'unexpected',
})

export class ApiError extends Error {
  constructor(
    message,
    { kind, status = null, validationIssues = [], fieldMessages = [] } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind ?? ERROR_KIND.UNEXPECTED
    this.status = status
    this.validationIssues = validationIssues
    this.fieldMessages = fieldMessages.length
      ? fieldMessages
      : validationIssues.map((issue) => issue.displayMessage)
    this.retryable =
      this.kind === ERROR_KIND.RETRYABLE ||
      this.kind === ERROR_KIND.TIMEOUT ||
      this.kind === ERROR_KIND.NETWORK
  }
}

const FIELD_LABELS = Object.freeze({
  invoice_amount: 'Invoice amount',
  invoice_currency: 'Invoice currency',
  client_country: 'Client country',
  platform_or_context: 'Platform or payment context',
  route_quotes: 'Route quotes',
  quote_id: 'Quote ID',
  route_name: 'Route name',
  pasted_text: 'Pasted quote text',
})

function cleanLocation(location) {
  if (!Array.isArray(location)) return []

  return location
    .filter((part) => part !== 'body')
    .filter(
      (part) =>
        (Number.isInteger(part) && part >= 0) ||
        (typeof part === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(part)),
    )
}

function locationPath(location) {
  if (location.length === 0) return 'request'

  return location.reduce((path, part) => {
    if (typeof part === 'number') return `${path}[${part}]`
    return path ? `${path}.${part}` : part
  }, '')
}

function locationLabel(location) {
  if (location.length === 0) return 'Request'

  return location
    .map((part) => {
      if (typeof part === 'number') return `item ${part + 1}`
      return FIELD_LABELS[part] ?? part.replace(/_/g, ' ')
    })
    .join(' → ')
}

function safeValidationMessage(value) {
  if (typeof value !== 'string') return 'This value is not valid.'
  const normalized = value.replace(/[\r\n\t]+/g, ' ').trim()
  return normalized ? normalized.slice(0, 300) : 'This value is not valid.'
}

/**
 * FastAPI returns 422 bodies as `{ detail: [{ loc, msg, type }, ...] }`.
 * Keep a machine-readable path and a short display sentence without retaining
 * rejected input values or the rest of the raw validation object.
 */
function readValidationIssues(detail) {
  if (!Array.isArray(detail)) return []

  return detail
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      const location = cleanLocation(item.loc)
      const path = locationPath(location)
      const message = safeValidationMessage(item.msg)
      return {
        location,
        path,
        message,
        displayMessage: `${locationLabel(location)}: ${message}`,
      }
    })
    .filter(Boolean)
}

/**
 * Every extraction failure crosses the API as one curated, non-sensitive
 * sentence chosen by the backend. Prefer it over a generic client string so a
 * timeout, a rate limit, and a missing provider key stay distinguishable.
 */
function safeDetail(value, fallback) {
  if (typeof value !== 'string') return fallback
  const normalized = value.replace(/[\r\n\t]+/g, ' ').trim()
  return normalized ? normalized.slice(0, 300) : fallback
}

/**
 * The backend reports configuration failures as retryable transport errors,
 * but no amount of retrying supplies a missing AI provider key or a supported
 * AI_PROVIDER value, so treat that one detail as an operator-facing state.
 */
const SERVER_CONFIGURATION_DETAIL =
  /not configured|provider, model, and api key|check configuration/i

async function readBody(response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('json')) return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

function toApiError(response, payload) {
  const status = response.status

  if (status === 422 || status === 400) {
    const validationIssues = readValidationIssues(payload?.detail)
    return new ApiError(
      validationIssues.length
        ? 'Some inputs were rejected by the comparison service.'
        : 'Some inputs were rejected by the comparison service.',
      { kind: ERROR_KIND.VALIDATION, status, validationIssues },
    )
  }

  if (status === 503) {
    const detail = safeDetail(
      payload?.detail,
      'AI extraction is temporarily unavailable. Retry in a moment.',
    )

    if (SERVER_CONFIGURATION_DETAIL.test(detail)) {
      return new ApiError(detail, { kind: ERROR_KIND.CONFIGURATION, status })
    }

    return new ApiError(detail, { kind: ERROR_KIND.RETRYABLE, status })
  }

  if (status === 504) {
    return new ApiError('The comparison service timed out. Retry in a moment.', {
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

async function request(path, options = {}, parseSuccess = null) {
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const headers = new Headers(options.headers)
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    const payload = await readBody(response)

    if (!response.ok) throw toApiError(response, payload)

    if (payload === null) {
      throw new ApiError('The comparison service returned an unreadable response.', {
        kind: ERROR_KIND.UNEXPECTED,
        status: response.status,
      })
    }

    if (!parseSuccess) return payload

    try {
      return parseSuccess(payload)
    } catch (error) {
      if (!(error instanceof ContractValidationError)) {
        throw new ApiError('The comparison response could not be processed safely.', {
          kind: ERROR_KIND.UNEXPECTED,
          status: response.status,
        })
      }
      throw new ApiError('The comparison service returned an invalid response. Please retry.', {
        kind: ERROR_KIND.UNEXPECTED,
        status: response.status,
      })
    }
  } catch (error) {
    if (error instanceof ApiError) throw error

    if (timedOut || error?.name === 'AbortError') {
      throw new ApiError(
        'The comparison took too long to respond. Check your connection and retry.',
        { kind: ERROR_KIND.TIMEOUT },
      )
    }

    throw new ApiError(
      'The comparison service could not be reached. Check your connection and retry.',
      { kind: ERROR_KIND.NETWORK },
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

export const apiClient = Object.freeze({
  getHealth: () => request('/health'),
  compareQuotes: (comparison) => {
    let body
    try {
      body = JSON.stringify(comparison)
    } catch {
      throw new ApiError('The comparison request could not be prepared safely.', {
        kind: ERROR_KIND.UNEXPECTED,
      })
    }

    return request('/api/compare', {
      method: 'POST',
      body,
    }, parseCompareResponse)
  },
})
