import { DEMO_CASE } from '../data/demoCase.js'

export const ROUTE_IDS = Object.freeze(['route-a', 'route-b'])
export const MAX_QUOTE_LENGTH = 50_000

export function createEmptyForm() {
  return {
    invoiceAmount: '',
    invoiceCurrency: 'USD',
    clientCountry: '',
    platformOrContext: '',
    routes: ROUTE_IDS.map((quoteId) => ({ quoteId, routeName: '', pastedText: '' })),
  }
}

export function createDemoForm() {
  return {
    invoiceAmount: DEMO_CASE.invoiceAmount,
    invoiceCurrency: DEMO_CASE.invoiceCurrency,
    clientCountry: DEMO_CASE.clientCountry,
    platformOrContext: DEMO_CASE.platformOrContext,
    routes: DEMO_CASE.routes.map((route, index) => ({
      quoteId: ROUTE_IDS[index] ?? route.quoteId,
      routeName: route.routeName,
      pastedText: route.pastedText,
    })),
  }
}

const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/

function isZeroDecimal(value) {
  return /^0+(?:\.0{1,2})?$/.test(value)
}

function hasTooManyDigits(value) {
  const [whole, fraction = ''] = value.split('.')
  const significantWhole = whole.replace(/^0+(?=\d)/, '')
  return significantWhole.length > 16 || significantWhole.length + fraction.length > 18
}

/**
 * Local validation mirrors `CompareRequest` so the user sees field-level
 * problems before a network request is spent on them.
 */
export function validateForm(form) {
  const errors = { routes: form.routes.map(() => ({})) }

  const amount = form.invoiceAmount.trim()
  if (!amount) {
    errors.invoiceAmount = 'Enter the invoice amount.'
  } else if (!AMOUNT_PATTERN.test(amount)) {
    errors.invoiceAmount = 'Use a positive number with at most two decimal places.'
  } else if (hasTooManyDigits(amount)) {
    errors.invoiceAmount = 'Use at most 16 digits before and 2 digits after the decimal point.'
  } else if (isZeroDecimal(amount)) {
    errors.invoiceAmount = 'The invoice amount must be greater than zero.'
  }

  const currency = form.invoiceCurrency.trim()
  if (!currency) {
    errors.invoiceCurrency = 'Enter the invoice currency.'
  } else if (!CURRENCY_PATTERN.test(currency)) {
    errors.invoiceCurrency = 'Use a three-letter currency code, for example USD.'
  }

  const country = form.clientCountry.trim()
  if (!country) {
    errors.clientCountry = 'Enter the client country.'
  } else if (country.length < 2 || country.length > 100) {
    errors.clientCountry = 'Use between 2 and 100 characters.'
  }

  const context = form.platformOrContext.trim()
  if (!context) {
    errors.platformOrContext = 'Describe the platform or payment context.'
  } else if (context.length > 200) {
    errors.platformOrContext = 'Use 200 characters or fewer.'
  }

  form.routes.forEach((route, index) => {
    const routeErrors = {}
    const routeName = route.routeName.trim()
    const pastedText = route.pastedText.trim()

    if (!routeName) {
      routeErrors.routeName = 'Name this route.'
    } else if (routeName.length > 120) {
      routeErrors.routeName = 'Use 120 characters or fewer.'
    }

    if (!pastedText) {
      routeErrors.pastedText = 'Paste the quote text for this route.'
    } else if (pastedText.length > MAX_QUOTE_LENGTH) {
      routeErrors.pastedText = 'This quote is too long. Paste only the pricing section.'
    }

    errors.routes[index] = routeErrors
  })

  return errors
}

export function hasErrors(errors) {
  const topLevel = Object.entries(errors).some(([key, value]) => key !== 'routes' && Boolean(value))
  const routeLevel = (errors.routes ?? []).some((routeErrors) =>
    Object.values(routeErrors).some(Boolean),
  )
  return topLevel || routeLevel
}

/** Normalize formatting only; never alter the meaning of pasted quote text. */
export function buildPayload(form) {
  const amount = normalizeDecimalString(form.invoiceAmount)

  return {
    invoice_amount: amount,
    invoice_currency: form.invoiceCurrency.trim().toUpperCase(),
    client_country: form.clientCountry.trim(),
    platform_or_context: form.platformOrContext.trim(),
    route_quotes: form.routes.map((route) => ({
      quote_id: route.quoteId,
      route_name: route.routeName.trim(),
      pasted_text: route.pastedText.trim(),
    })),
  }
}

/** Preserve exact decimal digits instead of routing money through IEEE-754 numbers. */
export function normalizeDecimalString(value) {
  const [rawWhole, rawFraction = ''] = value.trim().split('.')
  const whole = rawWhole.replace(/^0+(?=\d)/, '') || '0'
  const fraction = rawFraction.padEnd(2, '0')
  return `${whole}.${fraction}`
}
