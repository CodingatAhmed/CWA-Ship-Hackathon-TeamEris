import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

import { ERROR_KIND, apiClient } from './client.js'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function respondWith(status, body) {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
}

const REQUEST = Object.freeze({
  invoice_amount: '1000.00',
  invoice_currency: 'USD',
  client_country: 'United States',
  platform_or_context: 'Direct client invoice',
  route_quotes: [],
})

async function compareError() {
  try {
    await apiClient.compareQuotes(REQUEST)
  } catch (error) {
    return error
  }
  throw new Error('expected the comparison to reject')
}

/**
 * The backend reports every extraction failure as HTTP 503 with retryable:true,
 * so the curated detail sentence is the only signal that separates a transient
 * provider outage from a deployment that never had an AI key at all.
 */
test('a missing provider key is reported as a non-retryable configuration error', async () => {
  respondWith(503, {
    detail:
      'AI extraction is not configured on the server. Set the backend AI provider, model, and API key.',
    retryable: true,
  })

  const error = await compareError()

  assert.equal(error.kind, ERROR_KIND.CONFIGURATION)
  assert.equal(error.retryable, false)
  assert.match(error.message, /not configured on the server/)
})

test('the generic extraction failure is treated as a configuration error', async () => {
  respondWith(503, {
    detail: 'AI extraction is unavailable. Check configuration and retry.',
    retryable: true,
  })

  const error = await compareError()

  assert.equal(error.kind, ERROR_KIND.CONFIGURATION)
  assert.equal(error.retryable, false)
})

test('Groq provider outages stay retryable and keep the backend sentence', async () => {
  respondWith(503, {
    detail: 'The AI provider is temporarily unavailable. Please retry.',
    retryable: true,
  })

  const error = await compareError()

  assert.equal(error.kind, ERROR_KIND.RETRYABLE)
  assert.equal(error.retryable, true)
  assert.equal(error.message, 'The AI provider is temporarily unavailable. Please retry.')
})

test('a provider rate limit stays retryable and keeps its waiting advice', async () => {
  respondWith(503, {
    detail:
      "The AI provider's rate limit was reached. Wait about a minute and retry.",
    retryable: true,
  })

  const error = await compareError()

  assert.equal(error.kind, ERROR_KIND.RETRYABLE)
  assert.equal(error.retryable, true)
  assert.match(error.message, /rate limit was reached/)
})

test('Groq timeouts keep their own distinguishable sentence', async () => {
  respondWith(503, { detail: 'AI extraction timed out. Please retry.', retryable: true })

  const error = await compareError()

  assert.equal(error.kind, ERROR_KIND.RETRYABLE)
  assert.equal(error.message, 'AI extraction timed out. Please retry.')
})

test('an invalid provider response stays retryable', async () => {
  respondWith(503, {
    detail: 'AI extraction returned an invalid response. Please retry.',
    retryable: true,
  })

  const error = await compareError()

  assert.equal(error.kind, ERROR_KIND.RETRYABLE)
  assert.equal(error.message, 'AI extraction returned an invalid response. Please retry.')
})

test('a 503 without a usable detail still falls back to a safe sentence', async () => {
  respondWith(503, { detail: { unexpected: 'shape' }, retryable: true })

  const error = await compareError()

  assert.equal(error.kind, ERROR_KIND.RETRYABLE)
  assert.equal(error.message, 'AI extraction is temporarily unavailable. Retry in a moment.')
})

test('a hostile multi-line detail is flattened and bounded before display', async () => {
  respondWith(503, { detail: `line one\n\tline two ${'x'.repeat(500)}`, retryable: true })

  const error = await compareError()

  assert.ok(!error.message.includes('\n'))
  assert.ok(!error.message.includes('\t'))
  assert.ok(error.message.length <= 300)
})

test('the 500 path stays generic and non-retryable', async () => {
  respondWith(500, { detail: 'Comparison failed unexpectedly.', retryable: false })

  const error = await compareError()

  assert.equal(error.kind, ERROR_KIND.UNEXPECTED)
  assert.equal(error.retryable, false)
})
