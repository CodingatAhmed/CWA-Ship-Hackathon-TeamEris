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

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)

  const formatted = numeric.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return currency ? `${currency} ${formatted}` : formatted
}

export function formatPkr(value) {
  return formatMoney(value, 'PKR')
}
