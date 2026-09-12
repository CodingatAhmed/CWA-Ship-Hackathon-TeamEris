import assert from 'node:assert/strict'
import test from 'node:test'

import { ContractValidationError, parseCompareResponse } from './contract.js'

const REQUIRED_GUIDANCE =
  'Verify any tax or regulatory information with a qualified professional and current official sources.'

function evidence(quoteId, excerpt) {
  return {
    quote_id: quoteId,
    excerpt,
    source_url: null,
    start_char: 0,
    end_char: excerpt.length,
  }
}

function route(quoteId, routeName, rate, net) {
  const excerpt = `A fixed USD 10 fee applies to ${routeName}.`
  const sourceEvidence = evidence(quoteId, excerpt)

  return {
    quote_id: quoteId,
    route_name: routeName,
    status: 'ready',
    extracted_terms: [
      {
        name: 'fixed_fee',
        value: '10',
        label: 'Fixed fee',
        currency: 'USD',
        payer: 'freelancer',
        percentage_base: null,
        condition: null,
        state: 'explicit',
        eligibility_effect: null,
        evidence: [sourceEvidence],
      },
    ],
    missing_terms: [],
    unsupported_terms: [],
    itemized_fees: [
      {
        label: 'Fixed fee',
        amount: '10.00',
        currency: 'USD',
        payer: 'freelancer',
        is_deduction: true,
        evidence: [sourceEvidence],
        calculation_note: 'Deducted from freelancer proceeds.',
      },
    ],
    fx_rate_pkr: rate,
    estimated_net_pkr: net,
    conditions: [],
  }
}

function compareResponse() {
  return {
    routes: [
      route('route-a', 'Route A', '275', '272250.00'),
      route('route-b', 'Route B', '274', '271260.00'),
    ],
    recommendation: {
      quote_id: 'route-a',
      summary:
        'Best estimated net amount from the evidence provided. route-a has the highest supported estimate.',
      conditions: [],
    },
    recommendation_reason: null,
    calculation_assumptions: [
      'Estimates use only explicit terms that pass same-quote evidence validation.',
    ],
    verification_notice: {
      tax_and_regulatory_guidance: REQUIRED_GUIDANCE,
      official_source_urls: [],
    },
  }
}

function assertContractRejects(response, expectedPath) {
  assert.throws(
    () => parseCompareResponse(response),
    (error) => {
      assert.equal(error instanceof ContractValidationError, true)
      assert.equal(error.path, expectedPath)
      return true
    },
  )
}

test('parseCompareResponse accepts a minimal exact backend-shaped response unchanged', () => {
  const response = compareResponse()
  assert.equal(parseCompareResponse(response), response)
})

test('parseCompareResponse rejects a route missing unsupported_terms', () => {
  const response = compareResponse()
  delete response.routes[0].unsupported_terms
  assertContractRejects(response, 'response.routes[0].unsupported_terms')
})

test('parseCompareResponse rejects an unknown route status', () => {
  const response = compareResponse()
  response.routes[0].status = 'complete'
  assertContractRejects(response, 'response.routes[0].status')
})

test('parseCompareResponse rejects evidence attributed to another quote', () => {
  const response = compareResponse()
  response.routes[0].extracted_terms[0].evidence[0].quote_id = 'route-b'
  assertContractRejects(
    response,
    'response.routes[0].extracted_terms[0].evidence[0].quote_id',
  )
})

test('parseCompareResponse rejects malformed decimal strings', async (context) => {
  const cases = [
    ['fee amount', 'response.routes[0].itemized_fees[0].amount', (response) => {
      response.routes[0].itemized_fees[0].amount = '10.2.3'
    }],
    ['FX rate', 'response.routes[0].fx_rate_pkr', (response) => {
      response.routes[0].fx_rate_pkr = '1e'
    }],
    ['estimated net', 'response.routes[0].estimated_net_pkr', (response) => {
      response.routes[0].estimated_net_pkr = 272250
    }],
  ]

  for (const [name, path, mutate] of cases) {
    await context.test(name, () => {
      const response = compareResponse()
      mutate(response)
      assertContractRejects(response, path)
    })
  }
})

test('parseCompareResponse accepts Decimal exponent serialization for a tiny FX rate', () => {
  const response = compareResponse()
  response.routes[0].fx_rate_pkr = '1E-7'

  assert.equal(parseCompareResponse(response), response)
})

test('parseCompareResponse rejects a recommendation for an absent route', () => {
  const response = compareResponse()
  response.recommendation.quote_id = 'route-c'
  assertContractRejects(response, 'response.recommendation.quote_id')
})

test('parseCompareResponse requires a reason when no recommendation exists', () => {
  const response = compareResponse()
  response.recommendation = null
  response.recommendation_reason = null
  assertContractRejects(response, 'response.recommendation_reason')
})
