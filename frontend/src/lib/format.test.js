import assert from 'node:assert/strict'
import test from 'node:test'

import { formatFxRate, formatMoney } from './format.js'

test('formatMoney preserves null and formats zero distinctly', () => {
  assert.equal(formatMoney(null, 'PKR'), null)
  assert.equal(formatMoney(undefined, 'PKR'), null)
  assert.equal(formatMoney('', 'PKR'), null)
  assert.equal(formatMoney('0', 'PKR'), 'PKR 0.00')
  assert.equal(formatMoney('0.00', 'PKR'), 'PKR 0.00')
})

test('formatMoney groups large decimal strings without Number precision loss', () => {
  assert.equal(
    formatMoney('9007199254740991.99', 'PKR'),
    'PKR 9,007,199,254,740,991.99',
  )
})

test('formatMoney preserves high-precision fractional digits', () => {
  assert.equal(formatMoney('123.456789', 'USD'), 'USD 123.456789')
})

test('formatFxRate preserves null, zero, large, and high-precision values', () => {
  assert.equal(formatFxRate(null, 'USD'), null)
  assert.equal(formatFxRate('0', 'USD'), 'PKR 0.00 per USD')
  assert.equal(
    formatFxRate('9007199254740991.99', 'USD'),
    'PKR 9,007,199,254,740,991.99 per USD',
  )
  assert.equal(formatFxRate('278.123456', 'USD'), 'PKR 278.123456 per USD')
  assert.equal(formatFxRate('1E-7', 'USD'), 'PKR 1E-7 per USD')
  assert.equal(formatFxRate('278.12', ''), 'PKR 278.12 per invoice unit')
})
