const TERM_LABELS = Object.freeze({
  fixed_fee: 'Fixed fee',
  percentage_fee: 'Percentage fee',
  fx_rate_pkr: 'PKR conversion rate',
  receiving_fee_pkr: 'Receiving fee (PKR)',
  other_fee: 'Other fee',
  settlement_time: 'Settlement time',
  eligibility_condition: 'Eligibility condition',
})

export const STATUS_LABELS = Object.freeze({
  ready: 'Ready to compare',
  conditional: 'Estimate has conditions',
  insufficient_evidence: 'Not enough evidence',
  ineligible: 'Not eligible from quoted terms',
})

/** Turn a canonical term name into readable copy without hiding unknown names. */
export function termLabel(name) {
  if (!name) return 'Term'
  return TERM_LABELS[name] ?? name.replace(/_/g, ' ')
}

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? 'Status unavailable'
}

/**
 * Money arrives as a decimal string from the API. Never coerce a missing value
 * into 0 — `null` means "not calculable from the evidence".
 */
export function formatMoney(value, currency) {
  if (value === null || value === undefined || value === '') return null

  const raw = String(value).trim()
  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?$/)
  if (!match) {
    const isExponentDecimal = /^-?\d+(?:\.\d+)?[Ee][+-]?\d+$/.test(raw)
    if (!isExponentDecimal) return raw
    return currency ? `${currency} ${raw}` : raw
  }

  const [, sign, whole, fraction = ''] = match
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const formatted = `${sign}${groupedWhole}.${fraction.padEnd(2, '0')}`

  return currency ? `${currency} ${formatted}` : formatted
}

export function formatPkr(value) {
  return formatMoney(value, 'PKR')
}

export function formatFxRate(value, invoiceCurrency) {
  if (value === null || value === undefined || value === '') return null
  const rate = formatMoney(value, 'PKR')
  return invoiceCurrency ? `${rate} per ${invoiceCurrency}` : `${rate} per invoice unit`
}

export function formatTermValue(term) {
  if (term.value === null || term.value === undefined || term.value === '') {
    return 'Descriptive term'
  }

  if (term.name === 'percentage_fee') return `${term.value}%`
  if (term.name === 'fx_rate_pkr') return formatFxRate(term.value, term.currency)
  if (term.currency) return `${term.currency} ${term.value}`
  return term.value
}
