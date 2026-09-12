const ROUTE_STATUSES = new Set([
  'ready',
  'conditional',
  'insufficient_evidence',
  'ineligible',
])

const TERM_NAMES = new Set([
  'fixed_fee',
  'percentage_fee',
  'fx_rate_pkr',
  'receiving_fee_pkr',
  'other_fee',
  'settlement_time',
  'eligibility_condition',
])

const TERM_STATES = new Set(['explicit', 'conditional', 'contradictory', 'unsupported'])
const FEE_PAYERS = new Set(['freelancer', 'sender', 'unknown'])
const PERCENTAGE_BASES = new Set(['original_invoice', 'remaining_balance', 'unknown'])
const ELIGIBILITY_EFFECTS = new Set(['eligible', 'conditional', 'ineligible', 'unknown'])
const DECIMAL_PATTERN = /^\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?$/
const CURRENCY_PATTERN = /^[A-Z]{3}$/

const REQUIRED_VERIFICATION_GUIDANCE =
  'Verify any tax or regulatory information with a qualified professional and current official sources.'

export class ContractValidationError extends Error {
  constructor(path) {
    super(`Invalid comparison response at ${path}.`)
    this.name = 'ContractValidationError'
    this.path = path
  }
}

function reject(path) {
  throw new ContractValidationError(path)
}

function expectRecord(value, path) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) reject(path)
  return value
}

function expectArray(value, path, minimumLength = 0) {
  if (!Array.isArray(value) || value.length < minimumLength) reject(path)
  return value
}

function expectString(value, path, { allowEmpty = false } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) reject(path)
}

function expectNullableString(value, path, options) {
  if (value !== null) expectString(value, path, options)
}

function expectEnum(value, allowed, path) {
  if (!allowed.has(value)) reject(path)
}

function expectBoolean(value, path) {
  if (typeof value !== 'boolean') reject(path)
}

function expectNullableOffset(value, path) {
  if (value !== null && (!Number.isInteger(value) || value < 0)) reject(path)
}

function expectDecimalString(value, path, { positive = false } = {}) {
  if (typeof value !== 'string' || !DECIMAL_PATTERN.test(value)) reject(path)
  if (positive && /^0+(?:\.0+)?$/.test(value)) reject(path)
}

function expectCurrency(value, path) {
  if (typeof value !== 'string' || !CURRENCY_PATTERN.test(value)) reject(path)
}

function expectStringArray(value, path, minimumLength = 0) {
  expectArray(value, path, minimumLength).forEach((item, index) => {
    expectString(item, `${path}[${index}]`)
  })
}

function expectHttpUrl(value, path) {
  expectString(value, path)

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    reject(path)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') reject(path)
}

function validateEvidence(value, path, expectedQuoteId) {
  const evidence = expectRecord(value, path)
  expectString(evidence.quote_id, `${path}.quote_id`)
  if (evidence.quote_id !== expectedQuoteId) reject(`${path}.quote_id`)
  expectString(evidence.excerpt, `${path}.excerpt`)

  if (evidence.source_url !== null) expectHttpUrl(evidence.source_url, `${path}.source_url`)
  expectNullableOffset(evidence.start_char, `${path}.start_char`)
  expectNullableOffset(evidence.end_char, `${path}.end_char`)

  if (
    evidence.start_char !== null &&
    evidence.end_char !== null &&
    evidence.end_char < evidence.start_char
  ) {
    reject(`${path}.end_char`)
  }
}

function validateEvidenceArray(value, path, expectedQuoteId) {
  expectArray(value, path, 1).forEach((evidence, index) => {
    validateEvidence(evidence, `${path}[${index}]`, expectedQuoteId)
  })
}

function validateExtractedTerm(value, path, quoteId) {
  const term = expectRecord(value, path)
  expectEnum(term.name, TERM_NAMES, `${path}.name`)
  expectNullableString(term.value, `${path}.value`)
  expectNullableString(term.label, `${path}.label`, { allowEmpty: true })
  if (term.currency !== null) expectCurrency(term.currency, `${path}.currency`)
  if (term.payer !== null) expectEnum(term.payer, FEE_PAYERS, `${path}.payer`)
  if (term.percentage_base !== null) {
    expectEnum(term.percentage_base, PERCENTAGE_BASES, `${path}.percentage_base`)
  }
  expectNullableString(term.condition, `${path}.condition`, { allowEmpty: true })
  expectEnum(term.state, TERM_STATES, `${path}.state`)
  if (term.eligibility_effect !== null) {
    expectEnum(term.eligibility_effect, ELIGIBILITY_EFFECTS, `${path}.eligibility_effect`)
  }
  validateEvidenceArray(term.evidence, `${path}.evidence`, quoteId)
}

function validateMissingTerm(value, path) {
  const term = expectRecord(value, path)
  expectString(term.name, `${path}.name`)
  expectString(term.reason, `${path}.reason`)
  expectBoolean(term.affects_calculation, `${path}.affects_calculation`)
}

function validateFee(value, path, quoteId) {
  const fee = expectRecord(value, path)
  expectString(fee.label, `${path}.label`)
  expectDecimalString(fee.amount, `${path}.amount`)
  expectCurrency(fee.currency, `${path}.currency`)
  expectEnum(fee.payer, FEE_PAYERS, `${path}.payer`)
  expectBoolean(fee.is_deduction, `${path}.is_deduction`)
  validateEvidenceArray(fee.evidence, `${path}.evidence`, quoteId)
  expectString(fee.calculation_note, `${path}.calculation_note`)
}

function validateRoute(value, path) {
  const route = expectRecord(value, path)
  expectString(route.quote_id, `${path}.quote_id`)
  expectString(route.route_name, `${path}.route_name`)
  expectEnum(route.status, ROUTE_STATUSES, `${path}.status`)

  expectArray(route.extracted_terms, `${path}.extracted_terms`).forEach((term, index) => {
    validateExtractedTerm(term, `${path}.extracted_terms[${index}]`, route.quote_id)
  })
  expectArray(route.missing_terms, `${path}.missing_terms`).forEach((term, index) => {
    validateMissingTerm(term, `${path}.missing_terms[${index}]`)
  })
  expectArray(route.unsupported_terms, `${path}.unsupported_terms`).forEach((term, index) => {
    validateMissingTerm(term, `${path}.unsupported_terms[${index}]`)
  })
  expectArray(route.itemized_fees, `${path}.itemized_fees`).forEach((fee, index) => {
    validateFee(fee, `${path}.itemized_fees[${index}]`, route.quote_id)
  })

  if (route.fx_rate_pkr !== null) {
    expectDecimalString(route.fx_rate_pkr, `${path}.fx_rate_pkr`, { positive: true })
  }
  if (route.estimated_net_pkr !== null) {
    expectDecimalString(route.estimated_net_pkr, `${path}.estimated_net_pkr`)
  }
  expectStringArray(route.conditions, `${path}.conditions`)

  const cannotHaveEstimate =
    route.status === 'insufficient_evidence' || route.status === 'ineligible'
  if (cannotHaveEstimate && route.estimated_net_pkr !== null) {
    reject(`${path}.estimated_net_pkr`)
  }
  if (!cannotHaveEstimate && route.estimated_net_pkr === null) {
    reject(`${path}.estimated_net_pkr`)
  }

  return route.quote_id
}

function validateRecommendation(value, path) {
  const recommendation = expectRecord(value, path)
  expectString(recommendation.quote_id, `${path}.quote_id`)
  expectString(recommendation.summary, `${path}.summary`)
  expectStringArray(recommendation.conditions, `${path}.conditions`)
  return recommendation.quote_id
}

function validateVerificationNotice(value, path) {
  const notice = expectRecord(value, path)
  if (notice.tax_and_regulatory_guidance !== REQUIRED_VERIFICATION_GUIDANCE) {
    reject(`${path}.tax_and_regulatory_guidance`)
  }
  expectArray(notice.official_source_urls, `${path}.official_source_urls`).forEach(
    (url, index) => expectHttpUrl(url, `${path}.official_source_urls[${index}]`),
  )
}

/**
 * Validate the frozen FastAPI CompareResponse boundary without transforming it.
 * In particular, monetary decimal strings and nulls are returned exactly as sent.
 */
export function parseCompareResponse(value) {
  const response = expectRecord(value, 'response')
  const routeIds = expectArray(response.routes, 'response.routes', 2).map((route, index) =>
    validateRoute(route, `response.routes[${index}]`),
  )

  if (new Set(routeIds).size !== routeIds.length) reject('response.routes[].quote_id')

  let recommendedQuoteId = null
  if (response.recommendation !== null) {
    recommendedQuoteId = validateRecommendation(response.recommendation, 'response.recommendation')
  }
  expectNullableString(response.recommendation_reason, 'response.recommendation_reason')

  if (recommendedQuoteId !== null && !routeIds.includes(recommendedQuoteId)) {
    reject('response.recommendation.quote_id')
  }
  if (recommendedQuoteId !== null) {
    const recommendedRoute = response.routes.find(
      (route) => route.quote_id === recommendedQuoteId,
    )
    if (
      !recommendedRoute ||
      !['ready', 'conditional'].includes(recommendedRoute.status) ||
      recommendedRoute.estimated_net_pkr === null
    ) {
      reject('response.recommendation.quote_id')
    }
    if (response.recommendation_reason !== null) {
      reject('response.recommendation_reason')
    }
  }
  if (response.recommendation === null && response.recommendation_reason === null) {
    reject('response.recommendation_reason')
  }

  expectStringArray(response.calculation_assumptions, 'response.calculation_assumptions', 1)
  validateVerificationNotice(response.verification_notice, 'response.verification_notice')

  return response
}
