import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_QUOTE_LENGTH,
  ROUTE_IDS,
  buildPayload,
  createDemoForm,
  createEmptyForm,
  hasErrors,
  normalizeDecimalString,
  validateForm,
} from './comparison.js'

function validForm() {
  return createDemoForm()
}

test('empty and demo forms keep the exact two stable route IDs', () => {
  for (const form of [createEmptyForm(), createDemoForm()]) {
    assert.equal(form.routes.length, 2)
    assert.deepEqual(
      form.routes.map((route) => route.quoteId),
      ROUTE_IDS,
    )
  }

  const demo = createDemoForm()
  assert.match(demo.routes[0].routeName, /fictional/i)
  assert.match(demo.routes[1].routeName, /fictional/i)
  assert.match(demo.routes[0].pastedText, /not a current provider price/i)
  assert.match(demo.routes[1].pastedText, /not a current provider price/i)
})

test('zero invoice amounts are rejected locally', () => {
  for (const invoiceAmount of ['0', '00', '0.0', '000.00']) {
    const form = validForm()
    form.invoiceAmount = invoiceAmount

    const errors = validateForm(form)
    assert.equal(errors.invoiceAmount, 'The invoice amount must be greater than zero.')
    assert.equal(hasErrors(errors), true)
  }
})

test('malformed invoice amounts are rejected without numeric coercion', () => {
  for (const invoiceAmount of ['1e3', '1,000.00', '-1.00', '+1.00', '.50', '12.345']) {
    const form = validForm()
    form.invoiceAmount = invoiceAmount

    const errors = validateForm(form)
    assert.equal(errors.invoiceAmount, 'Use a positive number with at most two decimal places.')
    assert.equal(hasErrors(errors), true)
  }
})

test('quote validation accepts 50,000 characters and rejects 50,001', () => {
  const accepted = validForm()
  accepted.routes[0].pastedText = 'a'.repeat(MAX_QUOTE_LENGTH)
  assert.equal(validateForm(accepted).routes[0].pastedText, undefined)

  const rejected = validForm()
  rejected.routes[0].pastedText = 'a'.repeat(MAX_QUOTE_LENGTH + 1)
  assert.equal(
    validateForm(rejected).routes[0].pastedText,
    'This quote is too long. Paste only the pricing section.',
  )
})

test('payload uses the frozen request keys and preserves decimal precision', () => {
  const form = validForm()
  form.invoiceAmount = '9007199254740991.99'
  form.invoiceCurrency = ' usd '
  form.clientCountry = ' United States '
  form.platformOrContext = ' Direct client invoice '
  form.routes[0].routeName = ' Route A '
  form.routes[0].pastedText = ' Exact quote A text. '
  form.routes[1].routeName = ' Route B '
  form.routes[1].pastedText = ' Exact quote B text. '

  assert.equal(hasErrors(validateForm(form)), false)
  const payload = buildPayload(form)

  assert.deepEqual(Object.keys(payload), [
    'invoice_amount',
    'invoice_currency',
    'client_country',
    'platform_or_context',
    'route_quotes',
  ])
  assert.equal(payload.invoice_amount, '9007199254740991.99')
  assert.equal(typeof payload.invoice_amount, 'string')
  assert.equal(payload.invoice_currency, 'USD')
  assert.equal(payload.client_country, 'United States')
  assert.equal(payload.platform_or_context, 'Direct client invoice')
  assert.deepEqual(payload.route_quotes, [
    {
      quote_id: 'route-a',
      route_name: 'Route A',
      pasted_text: 'Exact quote A text.',
    },
    {
      quote_id: 'route-b',
      route_name: 'Route B',
      pasted_text: 'Exact quote B text.',
    },
  ])
})

test('decimal normalization pads digits as strings without passing through Number', () => {
  assert.equal(normalizeDecimalString('0009007199254740.9'), '9007199254740.90')
  assert.equal(normalizeDecimalString('9007199254740991.99'), '9007199254740991.99')
})

test('leading zeroes do not consume the backend significant-digit limit', () => {
  const form = validForm()
  form.invoiceAmount = '00000000000000001.00'

  assert.equal(hasErrors(validateForm(form)), false)
  assert.equal(buildPayload(form).invoice_amount, '1.00')
})
