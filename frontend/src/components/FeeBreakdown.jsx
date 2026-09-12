import { formatMoney } from '../lib/format.js'

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function payerLabel(payer) {
  if (!hasValue(payer)) return 'Payer unavailable'
  return String(payer).replace(/_/g, ' ')
}

function deductionLabel(isDeduction) {
  if (isDeduction === true) return 'Deducted from freelancer proceeds'
  if (isDeduction === false) return 'Not deducted from freelancer proceeds'
  return 'Deduction treatment unavailable'
}

function safeSourceUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function offsetLabel(evidence) {
  const hasStart = Number.isInteger(evidence?.start_char)
  const hasEnd = Number.isInteger(evidence?.end_char)

  if (hasStart && hasEnd) {
    return `characters ${evidence.start_char}–${evidence.end_char}`
  }
  if (hasStart) return `starts at character ${evidence.start_char}`
  if (hasEnd) return `ends at character ${evidence.end_char}`
  return null
}

function FeeEvidence({ evidence, feeKey, index }) {
  const sourceUrl = safeSourceUrl(evidence?.source_url)
  const location = offsetLabel(evidence)
  const quoteId = hasValue(evidence?.quote_id)
    ? String(evidence.quote_id)
    : 'unknown quote'

  return (
    <blockquote
      className="evidence-quote fee-evidence-quote"
      key={`${feeKey}-evidence-${quoteId}-${evidence?.start_char ?? 'start'}-${evidence?.end_char ?? 'end'}-${index}`}
    >
      {hasValue(evidence?.excerpt) ? evidence.excerpt : 'Evidence excerpt unavailable.'}
      <cite>
        From the pasted quote {quoteId}
        {location ? ` · ${location}` : ''}
        {sourceUrl && (
          <>
            {' · '}
            <a href={sourceUrl} target="_blank" rel="noreferrer noopener">
              View evidence source
            </a>
          </>
        )}
      </cite>
    </blockquote>
  )
}

function FeeBreakdown({ fees }) {
  const feeComponents = Array.isArray(fees) ? fees : []

  if (feeComponents.length === 0) {
    return <p className="empty-note">No fee components were itemized for this quote.</p>
  }

  return (
    <div className="fee-table-wrap">
      <table className="fee-table">
        <caption className="visually-hidden">Itemized fee components for this route</caption>
        <thead>
          <tr>
            <th scope="col">Fee component</th>
            <th scope="col">Amount</th>
            <th scope="col">Payer and effect</th>
            <th scope="col">Calculation note</th>
            <th scope="col">Supporting evidence</th>
          </tr>
        </thead>
        <tbody>
          {feeComponents.map((fee, index) => {
            const component = fee && typeof fee === 'object' ? fee : {}
            const feeKey = `${component.label ?? 'fee'}-${component.amount ?? 'amount'}-${component.currency ?? 'currency'}-${index}`
            const evidenceItems = Array.isArray(component.evidence) ? component.evidence : []

            return (
              <tr key={feeKey}>
                <th scope="row">{hasValue(component.label) ? component.label : 'Fee component'}</th>
                <td className="fee-amount">
                  {formatMoney(component.amount, component.currency) ?? 'Amount unavailable'}
                </td>
                <td className="fee-payer">
                  <span>{payerLabel(component.payer)}</span>
                  <span className="fee-effect">{deductionLabel(component.is_deduction)}</span>
                </td>
                <td className="fee-note">
                  {hasValue(component.calculation_note)
                    ? component.calculation_note
                    : 'Calculation note unavailable.'}
                </td>
                <td className="fee-evidence">
                  {evidenceItems.length > 0 ? (
                    evidenceItems.map((evidence, evidenceIndex) => (
                      <FeeEvidence
                        key={`${feeKey}-evidence-entry-${evidenceIndex}`}
                        evidence={evidence}
                        feeKey={feeKey}
                        index={evidenceIndex}
                      />
                    ))
                  ) : (
                    <span className="empty-note">
                      No evidence excerpt was returned for this component.
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default FeeBreakdown
